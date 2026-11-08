/* The simulation behind the chapter's animated train figure (app/components/pages/Train.tsx): pull requests enter a merge
   queue one at a time, a check turns green or red, a red one is set aside on a siding with its reason, the head merges and
   the next advances. Everything here is SIMULATED and deterministic: the scenario is a fixed list of events (`TRAIN_SCRIPT`),
   not a feed and not a real queue. The reducer refuses an illegal move (merge a car that is not the green head, set aside a
   car twice), so a wrong scenario fails the build instead of drawing a wrong picture. Pure numbers and strings, no clock, no
   randomness, tested in tests/train-sim.test.mjs. */

/** A car's place on the drawing: waiting in the queue, merged and gone up the main line, or parked on the siding. */
export const LANES = ["queue", "merged", "siding"] as const;
export type Lane = (typeof LANES)[number];

/** The check a car carries. `none` before it is tested, `running` while it runs, then `green` or `red`. */
export const CHECKS = ["none", "running", "green", "red"] as const;
export type Check = (typeof CHECKS)[number];

/** Why a red car is set aside; a key resolved to words in both languages by the component (messages train.reasons.*). */
export const REASONS = ["flaky", "types", "rebase", "review"] as const;
export type Reason = (typeof REASONS)[number];

/** What a beat says, a key resolved by the component (messages train.beats.*). */
export const BEATS = ["start", "enter", "running", "green", "red", "sideline", "merge", "done"] as const;
export type Beat = (typeof BEATS)[number];

/** One car of the scenario. `id` is internal; `label` is what the drawing shows (a fictional « PR 1 », never a real number). */
export type Car = { id: string; label: string };

/** A placed car: where it sits now and what it carries. The component turns `lane` + `index` into coordinates and lets CSS
    move it between beats, so the animation is only a transition between two still frames. */
export type PlacedCar = { id: string; label: string; lane: Lane; index: number; check: Check; reason?: Reason };

/** One frame of the scenario: the whole yard at one beat, plus what the beat is about (for the caption and the text version). */
export type Frame = { step: number; beat: Beat; carLabel?: string; reason?: Reason; cars: PlacedCar[] };

/** The events the scenario is written from. Settings as data: the scenario is this list, read once, never computed. */
export type TrainEvent =
  | { kind: "enter"; id: string; label: string }
  | { kind: "run"; id: string }
  | { kind: "check"; id: string; result: "green" | "red" }
  | { kind: "sideline"; id: string; reason: Reason }
  | { kind: "merge"; id: string };

/** The scenario the figure plays: three pull requests queue, the second is red and goes to the siding, the others merge and
    the line advances. Fictional labels and reasons only. */
export const TRAIN_SCRIPT: readonly TrainEvent[] = [
  { kind: "enter", id: "a", label: "PR 1" },
  { kind: "enter", id: "b", label: "PR 2" },
  { kind: "enter", id: "c", label: "PR 3" },
  { kind: "run", id: "a" },
  { kind: "check", id: "a", result: "green" },
  { kind: "merge", id: "a" },
  { kind: "run", id: "b" },
  { kind: "check", id: "b", result: "red" },
  { kind: "sideline", id: "b", reason: "flaky" },
  { kind: "run", id: "c" },
  { kind: "check", id: "c", result: "green" },
  { kind: "merge", id: "c" },
];

type Interior = { id: string; label: string; lane: Lane; check: Check; reason?: Reason; order: number };

/** The car with this id, or a build error naming the scenario's mistake. */
function find(cars: Interior[], id: string, move: string): Interior {
  const car = cars.find((c) => c.id === id);
  if (!car) throw new Error(`train scenario: ${move} names an unknown car "${id}"`);
  return car;
}

/** The head of the queue: the earliest car still waiting. */
const headOf = (cars: Interior[]): Interior | undefined =>
  cars.filter((c) => c.lane === "queue").sort((p, q) => p.order - q.order)[0];

/** Apply one event, refusing an illegal move so a wrong scenario fails the build. */
function apply(cars: Interior[], event: TrainEvent, at: number): { cars: Interior[]; frame: Omit<Frame, "cars"> } {
  const beatOf = (beat: Beat, carLabel?: string, reason?: Reason): Omit<Frame, "cars"> => ({
    step: at,
    beat,
    carLabel,
    reason,
  });
  switch (event.kind) {
    case "enter": {
      if (cars.some((c) => c.id === event.id)) throw new Error(`train scenario: car "${event.id}" enters twice`);
      cars.push({ id: event.id, label: event.label, lane: "queue", check: "none", order: at });
      return { cars, frame: beatOf("enter", event.label) };
    }
    case "run": {
      const car = find(cars, event.id, "run");
      if (car.lane !== "queue") throw new Error(`train scenario: "${car.label}" is not in the queue to run a check`);
      car.check = "running";
      return { cars, frame: beatOf("running", car.label) };
    }
    case "check": {
      const car = find(cars, event.id, "check");
      if (car.check !== "running") throw new Error(`train scenario: "${car.label}" was not running a check`);
      car.check = event.result;
      return { cars, frame: beatOf(event.result === "green" ? "green" : "red", car.label) };
    }
    case "sideline": {
      const car = find(cars, event.id, "sideline");
      if (car.check !== "red") throw new Error(`train scenario: only a red car is set aside ("${car.label}")`);
      car.lane = "siding";
      car.reason = event.reason;
      return { cars, frame: beatOf("sideline", car.label, event.reason) };
    }
    case "merge": {
      const car = find(cars, event.id, "merge");
      const head = headOf(cars);
      if (car.check !== "green") throw new Error(`train scenario: only a green car merges ("${car.label}")`);
      if (head?.id !== car.id) throw new Error(`train scenario: only the head of the queue merges ("${car.label}")`);
      car.lane = "merged";
      return { cars, frame: beatOf("merge", car.label) };
    }
  }
}

/** Give each car its index within its lane, in a stable order (queue and siding by arrival, merged by merge time). */
function place(cars: Interior[]): PlacedCar[] {
  const index = new Map<Lane, number>();
  return [...cars]
    .sort((p, q) => p.order - q.order)
    .map((c) => {
      const i = index.get(c.lane) ?? 0;
      index.set(c.lane, i + 1);
      return { id: c.id, label: c.label, lane: c.lane, index: i, check: c.check, reason: c.reason };
    });
}

/** The frames of a scenario: the empty yard, then the yard after each event. Pure; the component plays them in order. */
export function trainFrames(script: readonly TrainEvent[] = TRAIN_SCRIPT): Frame[] {
  const cars: Interior[] = [];
  const frames: Frame[] = [{ step: 0, beat: "start", cars: [] }];
  script.forEach((event, i) => {
    const { frame } = apply(cars, event, i + 1);
    frames.push({ ...frame, cars: place(cars) });
  });
  const last = frames[frames.length - 1];
  frames.push({ step: last.step + 1, beat: "done", cars: place(cars) });
  return frames;
}

/** What a finished scenario must hold, so the build refuses a broken one: at least one merge and one set-aside, every car
    ends merged or on the siding, no car both merged and red, lane indices are 0..n without a gap. Empty when the run is sound. */
export function trainProblems(script: readonly TrainEvent[] = TRAIN_SCRIPT): string[] {
  const out: string[] = [];
  let frames: Frame[];
  try {
    frames = trainFrames(script);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const end = frames[frames.length - 1].cars;
  if (!end.some((c) => c.lane === "merged")) out.push("the scenario never merges a car");
  if (!end.some((c) => c.lane === "siding")) out.push("the scenario never sets a red car aside");
  for (const c of end) {
    if (c.lane === "queue") out.push(`car "${c.label}" never leaves the queue`);
    if (c.lane === "merged" && c.check !== "green") out.push(`car "${c.label}" merged without a green check`);
    if (c.lane === "siding" && c.check !== "red") out.push(`car "${c.label}" is on the siding without a red check`);
  }
  for (const lane of LANES) {
    const idx = end
      .filter((c) => c.lane === lane)
      .map((c) => c.index)
      .sort((p, q) => p - q);
    idx.forEach((n, i) => {
      if (n !== i) out.push(`lane "${lane}" has a gap in its indices (${idx.join(", ")})`);
    });
  }
  return [...new Set(out)];
}
