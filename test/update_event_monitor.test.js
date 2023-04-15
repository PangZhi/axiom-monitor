const { UpdateEventMonitor } = require("../src/update_event_monitor");
const { UpdateEvent } = require("../src/update_event");

describe("Add Event", () => {
  test("correct when add one event", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 128));
    let historyEvents = eventMonitor.getHistoryEvents();
    expect(historyEvents.length).toBe(1);
    let event = historyEvents[0];
    expect(event.startBlockNumber).toBe(0);
    expect(event.numFinal).toBe(128);
  });

  test("correct when adding overlapping events", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 128));
    eventMonitor.addEvent(new UpdateEvent(0, 256));
    eventMonitor.addEvent(new UpdateEvent(0, 384));

    let historyEvents = eventMonitor.getHistoryEvents();

    expect(historyEvents.length).toBe(1);
    let event = historyEvents[0];
    expect(event.startBlockNumber).toBe(0);
    expect(event.numFinal).toBe(384);
  });

  test("correct when adding non-overlapping events", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 128));
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    let historyEvents = eventMonitor.getHistoryEvents();

    expect(historyEvents.length).toBe(2);
    let event = historyEvents[0];
    expect(event.startBlockNumber).toBe(0);
    expect(event.numFinal).toBe(128);
    event = historyEvents[1];
    expect(event.startBlockNumber).toBe(1024);
    expect(event.numFinal).toBe(128);
  });

  test("correct when adding out of order", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 128));
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    eventMonitor.addEvent(new UpdateEvent(0, 256));
    let historyEvents = eventMonitor.getHistoryEvents();

    expect(historyEvents.length).toBe(2);
    let event = historyEvents[0];
    expect(event.startBlockNumber).toBe(0);
    expect(event.numFinal).toBe(256);
    event = historyEvents[1];
    expect(event.startBlockNumber).toBe(1024);
    expect(event.numFinal).toBe(128);
  });
});

describe("Get Missing Blocks", () => {
  test("Return no missing blocks wehn covering last - 192", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 128));
    eventMonitor.addEvent(new UpdateEvent(0, 256));
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    let missingBlocks = eventMonitor.getMissingBlocks(1024 + 128 + 192);
    expect(missingBlocks.length).toBe(1);
    expect(missingBlocks[0]).toEqual([256, 1024]);
  });

  test("Return correctly for missing left ranges", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    eventMonitor.addEvent(new UpdateEvent(2048, 128));
    let missingBlocks = eventMonitor.getMissingBlocks(2048 + 128 + 1);
    expect(missingBlocks.length).toBe(2);
    expect(missingBlocks[0]).toEqual([0, 1024]);
    expect(missingBlocks[1]).toEqual([1152, 2048]);
  });


  test("Return correctly for empty events", () => {
    let eventMonitor = new UpdateEventMonitor();
    let missingBlocks = eventMonitor.getMissingBlocks(1192);
    expect(missingBlocks.length).toBe(1);
    expect(missingBlocks[0]).toEqual([0, 1001]);
  });


  test("Return correctly for missing right ranges", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(0, 1024));
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    let missingBlocks = eventMonitor.getMissingBlocks(1024 + 128 + 193);
    expect(missingBlocks.length).toBe(1);
    expect(missingBlocks[0]).toEqual([1152, 1154]);
  });

  test("Return correctly for missing ranges", () => {
    let eventMonitor = new UpdateEventMonitor();
    eventMonitor.addEvent(new UpdateEvent(1024, 128));
    eventMonitor.addEvent(new UpdateEvent(1024, 528));
    eventMonitor.addEvent(new UpdateEvent(1024, 256));
    eventMonitor.addEvent(new UpdateEvent(2048, 128));
    let missingBlocks = eventMonitor.getMissingBlocks(2048 + 128 + 292);
    expect(missingBlocks.length).toBe(3);
    expect(missingBlocks[0]).toEqual([0, 1024]);
    expect(missingBlocks[1]).toEqual([1552, 2048]);
    expect(missingBlocks[2]).toEqual([2176, 2176 + 292 - 192 + 1]);
  });

  // todo: test for checkAndUpdate
});
