/**
 * LinkedListError — thrown when an insertRoom call would violate the
 * singly-linked append-only list invariant.
 */
export class LinkedListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkedListError";
  }
}
