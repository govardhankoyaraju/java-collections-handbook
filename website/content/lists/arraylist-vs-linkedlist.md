## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Textbooks say a linked list has O(1) insertion and deletion while an array list has O(n). Developers who take that at face value choose `LinkedList` "because we insert a lot" — and ship code that is slower and uses several times more memory. The textbook statement leaves out two facts:

1. A linked list's O(1) insertion applies only **once you already hold the node** where the change happens. Getting there by index is O(n).
2. Constant factors — object allocation, pointer chasing, cache misses — differ enormously between the two, and they dominate real workloads.

This lesson takes both implementations apart so that the choice is based on evidence, not slogans.

## 3. Beginner-Friendly Explanation

- `ArrayList` is a **row of lockers**. Locker 500 is found instantly. Inserting at locker 3 means moving everything from locker 3 onward one locker to the right — but moving many small items between neighbouring lockers is fast.
- `LinkedList` is a **chain of people holding hands**, each person holding an item. Adding someone between two people is easy *once you are standing there*: they let go and take the new person's hands. But to reach the 500th person you must walk along the chain from one end, one person at a time.

So "insert in the middle" costs: for `ArrayList`, moving items; for `LinkedList`, *walking there*. Walking a chain is usually slower than sliding lockers.

## 4. Detailed Technical Explanation

### LinkedList structure

```java title="OpenJDK 25 · java.util.LinkedList (fields)"
transient int size = 0;
transient Node<E> first;   // head
transient Node<E> last;    // tail

private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;
}
```

`LinkedList` is a **doubly linked list** with references to both ends. It implements `List` and `Deque`, permits `null`, and is not thread-safe.

> [!CONTRACT]
> The `LinkedList` Javadoc states: "Operations that index into the list will traverse the list from the beginning or the end, whichever is closer to the specified index." That is the only performance statement it makes. It does **not** implement `RandomAccess`.

### Operation by operation

| Operation | `ArrayList` | `LinkedList` | Comment |
|---|---|---|---|
| `get(i)`, `set(i, e)` | **O(1)** | O(min(i, n − i)) | the decisive difference |
| `add(e)` at end | O(1) amortized | O(1), **allocates a node** | ArrayList occasionally copies |
| `add(0, e)` / `addFirst` | O(n) shift | **O(1)** | front insertion favours LinkedList… or `ArrayDeque` |
| `add(i, e)` by index | O(n − i) shift | O(min(i, n − i)) walk + O(1) link | both O(n) |
| `remove(0)` / `removeFirst` | O(n) shift | **O(1)** | again, `ArrayDeque` is O(1) too |
| `remove(i)` by index | O(n − i) | O(min(i, n − i)) | both O(n) |
| insert/remove **via `ListIterator`** at current position | O(n) shift | **O(1)** | LinkedList's genuine strength |
| `contains`, `indexOf` | O(n) | O(n) | sequential scan in both |
| `removeIf(p)` | O(n) one compaction pass | O(n) via iterator | equal asymptotically |
| iteration | O(n), sequential array reads | O(n), pointer chasing | same class, different constants |
| memory per element | 4 B reference + spare capacity | 24 B node (+ 4 B in parent references) | HotSpot model |

### Where LinkedList's O(1) really applies

A `ListIterator` positioned in the middle can `add`, `remove` and `set` in O(1) on a `LinkedList`, because it already holds the node. Algorithms that walk a list once and splice elements in or out as they go — merging, filtering with insertions — are the textbook fit. Even there, `ArrayList` with a single-pass rebuild (`removeIf`, or building a new list) is O(n) overall and usually faster in practice.

## 5. Internal Implementation

### Reaching a position

```java title="OpenJDK 25 · LinkedList.node(int index)"
Node<E> node(int index) {
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

Every indexed method (`get`, `set`, `add(i, e)`, `remove(i)`, `listIterator(i)`) calls `node(index)`. An indexed `for` loop over a `LinkedList` therefore walks from an end on **every** iteration: about n²/4 hops in total.

### Linking and unlinking

`linkLast(e)` creates `new Node<>(last, e, null)`, sets the old tail's `next`, updates `last`, and increments `size` and `modCount`. `unlink(x)` reconnects `x.prev` and `x.next` around `x` and **nulls `x.item`, `x.next` and `x.prev`** to help the GC. Both are O(1).

### Iteration

`LinkedList.ListItr` keeps `lastReturned`, `next` (the next node) and `nextIndex`. `next()` follows `next.next`. `remove()` unlinks `lastReturned` in O(1). Fail-fast checks use `modCount` exactly as in `ArrayList`.

## 6. Memory Representation

```text
ArrayList<String> ["A","B","C"]          LinkedList<String> ["A","B","C"]

ArrayList ─► Object[] [●][●][●][ ][ ]... LinkedList(first ●, last ●, size 3)
                       │  │  │                    │                │
                       ▼  ▼  ▼                    ▼                ▼
                      "A""B""C"          Node ⇄ Node ⇄ Node   (each: prev ●, item ●, next ●)
                                           │      │      │
                                           ▼      ▼      ▼
                                          "A"    "B"    "C"

Model (64-bit HotSpot, compressed oops): ArrayList ≈ 4 B/element (+ spare capacity),
LinkedList ≈ 24 B/element. Elements themselves cost the same in both.
```

A `LinkedList` of n elements is n + 1 objects; an `ArrayList` is 2. Every node is something the GC must trace.

## 7. Runnable Java Example

```example
m05/LinkedListTraversalModel
```

A JMH benchmark comparing full iteration of both lists is included in the project as `ListIterationBenchmark` (not run here, and no numbers are published — run it on your hardware):

```bash title="Run the iteration benchmark yourself"
cd java-examples
./gradlew jmh -PjmhArgs="ListIterationBenchmark -f 1 -wi 5 -i 5"
```

## 8. Execution Walkthrough

1. `hopsForGet(index, size)` mirrors `LinkedList.node`: walk from the head for the first half of the indexes, from the tail for the second half.
2. For a 10-element list, an indexed loop needs 0+1+2+3+4 hops for the first half and 4+3+2+1+0 for the second: **20**.
3. For 1,000 elements: **249,500** hops; for 100,000 elements: **2,499,950,000** hops — about n²/4. The iterator needs only n − 1 hops (99,999).
4. `sumByIndex` and `sumByIterator` compute the same sum: the bug is purely a performance bug, invisible to functional tests.

## 9. Complexity Analysis

Asymptotically, for the operations most business code performs — append, iterate, index, search — **`ArrayList` is never worse** than `LinkedList` and is better for indexed access. `LinkedList` wins asymptotically only for:

- insertion/removal at the **front** (but `ArrayDeque` matches it),
- insertion/removal **at an iterator position** while walking.

In constants, `ArrayList` usually wins because of contiguous memory, no per-element allocation and fewer objects for the GC. Space: `ArrayList` O(n) references plus up to ~50% spare capacity; `LinkedList` O(n) nodes at roughly 6× the bytes per element in the HotSpot model.

## 10. Incorrect Implementation

```java
// A paginated API that receives a LinkedList from a library and indexes into it
List<Trade> trades = tradeFeed.fetchAll();      // happens to be a LinkedList
for (int i = 0; i < trades.size(); i++) {       // O(n²) on LinkedList
    Trade t = trades.get(i);
    ...
}
```

Also wrong: choosing `LinkedList` for a FIFO work queue "because removing from the front is O(1)" — correct asymptotically, but `ArrayDeque` provides the same O(1) with an array and no per-element allocation; `LinkedList` also silently accepts `null`, which a queue usually should reject.

## 11. Correct Implementation

```java
// Iterate — correct and efficient for every List implementation
for (Trade t : trades) { ... }

// If you truly need indexes, choose the strategy by capability
if (trades instanceof RandomAccess) {
    for (int i = 0; i < trades.size(); i++) process(i, trades.get(i));
} else {
    int i = 0;
    for (Trade t : trades) process(i++, t);
}

// Queues
Deque<Job> queue = new ArrayDeque<>();
```

`Collections` uses the same `RandomAccess` check internally for algorithms such as `binarySearch`.

## 12. Enterprise Use Case

**Choosing a default.** In code review, a team standard such as "use `ArrayList` for lists, `ArrayDeque` for queues and stacks; `LinkedList` requires a comment explaining why" prevents most list-related performance issues. Typical justified `LinkedList` uses are rare:

- an algorithm that walks a large list once and inserts/removes many elements **at the iterator position** (e.g. an in-place merge of two sorted streams into an existing list) and has been measured to benefit;
- code that must provide both `List` and `Deque` views of the same object to an API you do not control.

**Spring/JPA note.** Collections returned by repositories and ORM providers are typically `ArrayList`-backed or provider-specific wrappers (e.g. Hibernate's `PersistentBag`). Do not assume `RandomAccess` on collections you did not create — iterate them.

## 13. Alternatives and Trade-offs

| Need | Prefer | Why |
|---|---|---|
| Indexed access, appends, iteration | `ArrayList` | O(1) index, compact, cache-friendly |
| FIFO queue / LIFO stack | `ArrayDeque` | O(1) ends, array-backed, rejects null |
| Many insertions at an iterator position in a huge list | `LinkedList` (measure!) or rebuild with `ArrayList` in one pass | O(1) splice vs single O(n) rebuild |
| Priority order | `PriorityQueue` | binary heap |
| Thread-safe, read-mostly | `CopyOnWriteArrayList` | snapshot iteration |
| Immutable result | `List.copyOf` / `toList()` | exact size, unmodifiable |

## 14. Edge Cases

- **`LinkedList.get(i)` near the middle is the worst case**: about n/2 hops.
- **`remove(Object)` on `LinkedList`** is O(n) to find, O(1) to unlink — still O(n).
- **Overloads:** `LinkedList.remove()` (Deque: head), `remove(int)` (index), `remove(Object)` (value). With `LinkedList<Integer>`, `remove(1)` removes index 1.
- **`subList` on `LinkedList`** is also a view whose indexed operations walk nodes.
- **Null elements:** both allow `null`; `ArrayDeque` does not — a migration from `LinkedList` to `ArrayDeque` must check for nulls.
- **Serialization and `clone()`** are supported by both; `LinkedList.clone()` is shallow and O(n).

## 15. Interview Questions

**Q1. Why does `ArrayList` often outperform `LinkedList` even for insertions?**

<details><summary>Answer</summary>

Because insertion "at index i" in a `LinkedList` must first walk to node i (O(n)), while `ArrayList` shifts elements with a fast block copy (`System.arraycopy`) in contiguous memory. `LinkedList` also allocates a node per insertion and suffers pointer chasing. Only insertion at the ends or at an iterator position is O(1) for `LinkedList`. Measure for your workload; the asymptotic class alone does not decide.

</details>

**Q2. What is the cost of `for (int i = 0; i < list.size(); i++) list.get(i)` on a `LinkedList` of n elements?**

<details><summary>Answer</summary>

About n²/4 node hops (each `get` walks from the nearer end), i.e. O(n²). The for-each loop uses the iterator and is O(n).

</details>

**Q3. When would you legitimately choose `LinkedList`?**

<details><summary>Answer</summary>

When an algorithm performs many insertions/removals at the current position of a `ListIterator` over a large list, and measurements show that a single-pass rebuild with `ArrayList` is slower; or when an API requires one object that is both a `List` and a `Deque`. For queues and stacks use `ArrayDeque`.

</details>

**Q4. How much memory does a `LinkedList<Integer>` of one million distinct values use compared with `ArrayList<Integer>`?**

<details><summary>Answer</summary>

Under the HotSpot model (12-byte headers, compressed oops): `LinkedList` ≈ 1M × (24-byte node + 16-byte Integer) ≈ 40 MB; `ArrayList` ≈ 4 MB of references + 16 MB of Integers ≈ 20 MB. The difference is the node objects. State assumptions; verify with JOL.

</details>

## 16. Practice Exercise

You maintain a `List<Order>` of 200,000 open orders. Every minute, a job must (a) remove cancelled orders and (b) insert, directly after each "split" order, its two child orders. Write an O(n) implementation that works well with `ArrayList`, and explain why repeated `add(i, child)` would not.

<details><summary>Solution</summary>

```java
static List<Order> refresh(List<Order> orders) {
    List<Order> result = new ArrayList<>(orders.size() + orders.size() / 10); // guess for children
    for (Order o : orders) {
        if (o.isCancelled()) continue;                 // (a) drop
        result.add(o);
        if (o.isSplit()) {                             // (b) insert children right after parent
            result.add(o.childA());
            result.add(o.childB());
        }
    }
    return result;
}
```

One pass, O(n) time and O(n) extra space; every `add` is an amortized O(1) append. Calling `orders.add(i + 1, child)` in a loop shifts the tail for every insertion — O(k · n) for k insertions. A `LinkedList` with a `ListIterator` would also be O(n), but with node allocations and pointer chasing; the rebuild is simpler and typically faster.

</details>

## 17. Key Takeaways

- `LinkedList` is a doubly linked list of `Node(item, next, prev)` objects with head and tail references.
- Its O(1) insert/remove applies at the ends or at an iterator position — **reaching an index is O(n)**.
- `ArrayList` gives O(1) indexing, compact memory and better cache behaviour; it is the right default.
- For queues and stacks, use `ArrayDeque`, not `LinkedList`.
- Never index into a `List` you did not create without checking `RandomAccess` — iterate instead.

## 18. Official References

- [`java.util.LinkedList` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedList.html)
- [`java.util.ArrayList` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html)
- [`java.util.ArrayDeque` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html)
- [`java.util.ListIterator` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ListIterator.html)
- [OpenJDK 25 source: `LinkedList.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/LinkedList.java)
