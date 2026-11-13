import api, {
  API_BASE,
  apiErrorMessage,
  apiErrorDetails,
  resolveApiBase,
} from './api';

/**
 * The API client is the one place the browser decides where every request
 * goes, so its failure modes are worth a test of their own (audit finding
 * P1-15).
 */
describe('resolveApiBase', () => {
  const resolveWith = (value) => {
    let resolved;
    jest.isolateModules(() => {
      if (value === undefined) delete process.env.REACT_APP_API_URL;
      else process.env.REACT_APP_API_URL = value;
      ({ resolveApiBase: resolved } = require('./api'));
    });
    return resolved();
  };

  const original = process.env.REACT_APP_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = original;
  });

  it('falls back to the same origin when nothing is configured', () => {
    expect(resolveWith(undefined)).toBe('/api');
  });

  it('falls back when the variable is empty', () => {
    expect(resolveWith('')).toBe('/api');
  });

  it('falls back when the variable is only whitespace', () => {
    expect(resolveWith('   ')).toBe('/api');
  });

  it('uses the configured address', () => {
    expect(resolveWith('https://api.afiafoodhub.test/api')).toBe('https://api.afiafoodhub.test/api');
  });

  it('strips the trailing slashes', () => {
    expect(resolveWith('https://api.afiafoodhub.test/api//')).toBe('https://api.afiafoodhub.test/api');
  });

  it('never points a production build at a hard-coded host', () => {
    // The original code had a third fallback that could never be reached,
    // so a build with no variable set silently used the visitor's machine.
    expect(resolveWith(undefined)).not.toMatch(/^https?:\/\//);
  });
});

describe('API_BASE', () => {
  it('is the resolved base', () => {
    expect(API_BASE).toBe(resolveApiBase());
  });
});

describe('apiErrorMessage', () => {
  it('uses the structured error the API sent', () => {
    const error = { response: { data: { error: { message: 'That dish is sold out.' } } } };

    expect(apiErrorMessage(error)).toBe('That dish is sold out.');
  });

  it('falls back to a plain message', () => {
    const error = { response: { data: { message: 'Something is wrong.' } } };

    expect(apiErrorMessage(error)).toBe('Something is wrong.');
  });

  it('explains a network failure in the customer’s terms', () => {
    const error = { code: 'ERR_NETWORK' };

    expect(apiErrorMessage(error)).toMatch(/could not reach/i);
  });

  it('uses the fallback when the API said nothing useful', () => {
    expect(apiErrorMessage({}, 'We could not load your cart.')).toBe('We could not load your cart.');
  });

  it('never returns undefined', () => {
    expect(apiErrorMessage(undefined)).toBeTruthy();
  });
});

describe('apiErrorDetails', () => {
  it('returns the field details', () => {
    const details = [{ field: 'email', message: 'That email is already registered.' }];

    expect(apiErrorDetails({ response: { data: { error: { details } } } })).toBe(details);
  });

  it('returns null when there are none', () => {
    expect(apiErrorDetails({ response: { data: {} } })).toBeNull();
  });
});

describe('the session interceptor', () => {
  const rejectWith = (status, url) => {
    const error = new Error('Request failed with status code ' + status);
    error.response = { status, data: {} };
    error.config = { url };
    error.isAxiosError = true;
    return error;
  };

  let dispatched;

  beforeEach(() => {
    dispatched = [];
    jest.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
      dispatched.push(event);
      return true;
    });
  });

  afterEach(() => {
    window.dispatchEvent.mockRestore();
  });

  it('announces an expired session so the interface can sign the customer out', async () => {
    const error = rejectWith(401, '/orders/my-orders');

    await expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toBeTruthy();

    expect(dispatched.map((e) => e.type)).toContain('afia:session-expired');
  });

  it('does not announce an expiry when the request was itself a sign-in', async () => {
    // A failed sign-in is a 401 too. Wiping the session on it destroyed the
    // form the customer was filling in (audit finding P2-11).
    const error = rejectWith(401, '/auth/login');

    await expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toBeTruthy();

    expect(dispatched.map((e) => e.type)).not.toContain('afia:session-expired');
  });

  it('leaves other failures alone', async () => {
    const error = rejectWith(500, '/orders/my-orders');

    await expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toBeTruthy();

    expect(dispatched.map((e) => e.type)).not.toContain('afia:session-expired');
  });
});
