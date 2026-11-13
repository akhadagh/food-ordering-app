import { ORDER_STATUS_TRANSITIONS, nextOrderStatuses, ORDER_STATUS, ORDER_STATUS_FLOW } from './brand';

describe('the order status registry', () => {
  it('names every status the kitchen can be in', () => {
    for (const status of ORDER_STATUS_FLOW) {
      expect(ORDER_STATUS[status]).toBeTruthy();
      expect(ORDER_STATUS[status].label).toBeTruthy();
    }
    expect(ORDER_STATUS.cancelled).toBeTruthy();
  });

  it('moves an order one step at a time', () => {
    expect(nextOrderStatuses('placed')).toEqual(['confirmed', 'cancelled']);
    expect(nextOrderStatuses('confirmed')).toEqual(['preparing', 'cancelled']);
    expect(nextOrderStatuses('preparing')).toEqual(['ready', 'cancelled']);
    expect(nextOrderStatuses('ready')).toEqual(['out_for_delivery', 'cancelled']);
    expect(nextOrderStatuses('out_for_delivery')).toEqual(['delivered', 'cancelled']);
  });

  it('does not move a finished order', () => {
    expect(nextOrderStatuses('delivered')).toEqual([]);
    expect(nextOrderStatuses('cancelled')).toEqual([]);
  });

  it('knows nothing about a status it does not have', () => {
    expect(nextOrderStatuses('teleported')).toEqual([]);
  });

  it('never offers a status that is not one of the kitchen’s', () => {
    const known = [...ORDER_STATUS_FLOW, 'cancelled'];

    for (const [from, targets] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
      expect(known).toContain(from);
      for (const to of targets) {
        expect(known).toContain(to);
      }
    }
  });
});
