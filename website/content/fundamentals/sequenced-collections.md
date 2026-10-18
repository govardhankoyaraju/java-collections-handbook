## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Before Java 21, "give me the last element" had a different spelling for every collection:

| Collection | First element | Last element |
|---|---|---|
| `List` | `list.get(0)` | `list.get(list.size() - 1)` |
| `Deque` | `deque.getFirst()` | `deque.getLast()` |
| `SortedSet` | `set.first()` | `set.last()` |
| `LinkedHashSet` | `set.iterator().next()` | *iterate the whole set* |
| `LinkedHashMap` | `map.entrySet().iterator().next()` | *iterate the whole map* |

Reverse iteration was equally inconsistent (`descendingIterator`, `descendingSet`, `ListIterator` from the end, or copying and reversing). Worse, there was **no type** meaning "a collection with a defined order": a method that needed ordered input could only demand a `List` (too narrow) or a `Collection` (no guarantee). JEP 431 (Java 21) introduced **sequenced collections** to fix both problems.

## 3. Beginner-Friendly Explanation

Some collections remember an order — positions in a list, the order items were added to a `LinkedHashSet`, sorted order in a `TreeSet`. Java 21 gave all of them a shared vocabulary:

- `getFirst()`, `getLast()` — peek at either end,
- `addFirst(e)`, `addLast(e)` — insert at an end (where that makes sense),
- `removeFirst()`, `removeLast()` — take from an end,
- `reversed()` — look at the same collection back to front.

Maps with an order (`LinkedHashMap`, `TreeMap`) got matching methods: `firstEntry()`, `lastEntry()`, `putFirst`, `pollLastEntry()`, `reversed()`. Collections without a meaningful order — `HashSet`, `HashMap`, `PriorityQueue` — did not.

## 4. Detailed Technical Explanation

### The three interfaces

```java title="Java 21+ · java.util (signatures)"
public interface SequencedCollection<E> extends Collection<E> {
    SequencedCollection<E> reversed();
    default void addFirst(E e)  { throw new UnsupportedOperationException(); }
    default void addLast(E e)   { throw new UnsupportedOperationException(); }
    default E getFirst()        { /* iterator().next() */ }
    default E getLast()         { /* reversed().iterator().next() */ }
    default E removeFirst()     { /* iterator remove */ }
    default E removeLast()      { /* via reversed() */ }
}
public interface SequencedSet<E> extends SequencedCollection<E>, Set<E> {
    SequencedSet<E> reversed();
}
public interface SequencedMap<K, V> extends Map<K, V> {
    SequencedMap<K, V> reversed();
    // firstEntry, lastEntry, pollFirstEntry, pollLastEntry, putFirst, putLast,
    // sequencedKeySet, sequencedValues, sequencedEntrySet
}
```

### Where they sit

- `List` and `Deque` extend `SequencedCollection`.
- `LinkedHashSet` implements `SequencedSet`; `SortedSet` extends `SequencedSet`.
- `LinkedHashMap` implements `SequencedMap`; `SortedMap` extends `SequencedMap`.
- `Collections` gained `unmodifiableSequencedCollection`, `unmodifiableSequencedSet` and `unmodifiableSequencedMap`.

### Encounter order

> [!CONTRACT]
> A sequenced collection has a well-defined **encounter order**: elements are conceptually arranged in a linear sequence from first to last. `iterator()`, `forEach`, `stream()` and `toArray()` all follow it, and `reversed()` returns a **view** in the opposite order. Changes through the view are visible in the original and vice versa (when the collection permits modification).

### Behaviour differs by implementation

| Method | `ArrayList` | `ArrayDeque` | `LinkedHashSet` | `TreeSet` | `List.of(...)` |
|---|---|---|---|---|---|
| `getFirst/Last` on empty | `NoSuchElementException` | `NoSuchElementException` | `NoSuchElementException` | `NoSuchElementException` | `NoSuchElementException` |
| `addFirst(e)` | inserts at index 0 (O(n)) | O(1) | adds, or **moves an existing element** to the front | **`UnsupportedOperationException`** | `UnsupportedOperationException` |
| `removeLast()` | O(1) | O(1) | O(1) | O(log n) | `UnsupportedOperationException` |
| `reversed()` | view | view | view | view (`descendingSet`-like) | unmodifiable view |

`SortedSet` throws on `addFirst`/`addLast` because position is decided by comparison, not by the caller. Likewise `SortedMap.putFirst/putLast` throw `UnsupportedOperationException`.

### Snapshot entries vs live views

`SequencedMap.firstEntry()`, `lastEntry()`, `pollFirstEntry()` and `pollLastEntry()` return **snapshots**: unmodifiable `Map.Entry` objects whose `setValue` throws. Iterating `entrySet()` or `sequencedEntrySet()` gives entries connected to the map (where supported).

## 5. Internal Implementation

Most methods are **default methods** implemented on top of `iterator()` and `reversed()`, so retrofitting them did not break existing implementations. JDK classes override them for efficiency:

- `ArrayList.getLast()` reads `elementData[size - 1]` directly; `removeLast()` removes the last slot without shifting.
- `List.reversed()` (default) returns a `ReverseOrderListView` that maps index `i` to `size − 1 − i`. For `ArrayList` it is the random-access variant.
- `LinkedHashSet.addFirst(e)` relinks the existing entry to the head of its internal linked list, or inserts at the head.
- `LinkedHashMap.putFirst/putLast` set an internal "put mode" and call `put`; for an existing key the entry is moved.

> [!IMPL]
> In OpenJDK 21–25 `LinkedHashMap.putFirst` inserts a new entry at the head of the list and then, like every `put`, calls `removeEldestEntry(head)`. In a map that evicts its eldest entry (an LRU cache), the entry just inserted with `putFirst` *is* the eldest and is evicted immediately. The java-examples test `putFirstOnAnEvictingMapEvictsTheEntryJustInserted` demonstrates this on JDK 25. Do not use `putFirst` on evicting maps.

## 6. Memory Representation

`reversed()` allocates only a small view object; no elements are copied.

```text
ArrayList elementData:  [validate][price][persist][audit]
                           0        1       2        3
reversed() view index:     3        2       1        0
view.get(0)  ─► original.get(size - 1 - 0) ─► "audit"
view.addFirst("x") ─► original.addLast("x")
```

## 7. Runnable Java Example

```example
m03/SequencedTour
```

## 8. Execution Walkthrough

1. `ends(...)` is written once against `SequencedCollection` and works for `ArrayList`, `ArrayDeque`, `LinkedHashSet` and `TreeSet`. Before Java 21 that method could not be written without type checks.
2. `steps.reversed().addFirst("audit")` adds to the *front of the view*, which is the *end of the list*: `[validate, price, persist, audit]`.
3. `tags.addFirst("export")` on a `LinkedHashSet` that already contains `"export"` **moves** it to the front instead of adding a duplicate.
4. `TreeSet.addFirst` throws `UnsupportedOperationException` — sorted collections own their order.
5. `stock.putFirst("SKU-1", 9)` on a `LinkedHashMap` places the new mapping first; `reversed()` prints the map back to front; `pollLastEntry()` removes and returns the last mapping as a snapshot.
6. `getFirst()` on an empty list throws `NoSuchElementException` — unlike `peekFirst()` on a `Deque`, which returns `null`.

## 9. Complexity Analysis

| Operation | `ArrayList` | `LinkedList`/`ArrayDeque` | `LinkedHashSet`/`LinkedHashMap` | `TreeSet`/`TreeMap` |
|---|---|---|---|---|
| `getFirst` | O(1) | O(1) | O(1) | O(log n) |
| `getLast` | O(1) | O(1) | O(1) | O(log n) |
| `addFirst` | O(n) | O(1) (amortized for `ArrayDeque`) | O(1) expected | unsupported |
| `removeFirst` | O(n) | O(1) | O(1) expected | O(log n) |
| `reversed()` | O(1) view | O(1) view | O(1) view | O(1) view |

Note `ArrayList.addFirst` and `removeFirst` shift every element — the convenient name does not make them cheap.

## 10. Incorrect Implementation

```java
// Pre-21 idioms that are fragile or slow
String last = list.get(list.size() - 1);                    // IndexOutOfBounds on empty, noisy
String newest = linkedHashSet.stream().reduce((a, b) -> b).orElseThrow(); // O(n) to find the last
List<Event> newestFirst = new ArrayList<>(events);
Collections.reverse(newestFirst);                           // O(n) copy just to iterate backwards
```

A Java 21 mistake: using `addFirst` on an `ArrayList` in a loop to build a "newest first" list — O(n²).

## 11. Correct Implementation

```java
String last = list.getLast();                                // NoSuchElementException if empty — explicit
String newest = linkedHashSet.getLast();                     // O(1)
for (Event e : events.reversed()) { render(e); }             // O(1) view, no copy

// Building newest-first efficiently:
Deque<Event> newestFirst = new ArrayDeque<>();
for (Event e : incoming) newestFirst.addFirst(e);            // O(1) each
```

## 12. Enterprise Use Case

**Audit trail endpoint.** A service keeps the last N status changes of an order in a `LinkedHashMap<Instant, StatusChange>` (insertion order = chronological order). The API must return the latest change and the history newest-first:

```java
public OrderHistoryDto history(SequencedMap<Instant, StatusChange> changes) {
    Map.Entry<Instant, StatusChange> latest = changes.lastEntry();      // snapshot, null if empty
    List<StatusChange> newestFirst = List.copyOf(changes.reversed().values()); // ordered copy
    return new OrderHistoryDto(latest == null ? null : latest.getValue(), newestFirst);
}
```

The parameter type `SequencedMap` documents the requirement ("must have a defined order") and accepts both `LinkedHashMap` and `TreeMap`, while rejecting a `HashMap` at compile time — something no pre-21 type could express.

## 13. Alternatives and Trade-offs

- **`Deque`** remains the right type when you need efficient operations at both ends; `SequencedCollection` is about *order*, not about efficient insertion.
- **`NavigableSet.descendingSet()` / `NavigableMap.descendingMap()`** predate `reversed()` and remain useful for range views.
- **`List.reversed()` vs `Collections.reverse(list)`:** the view is O(1) and does not modify the list; `Collections.reverse` reorders in place in O(n).
- **Java 17 compatibility:** none of these APIs exist before 21. Libraries that must support 17 cannot expose `SequencedCollection` in their APIs.

## 14. Edge Cases

- **Empty collections:** `getFirst`/`getLast`/`removeFirst`/`removeLast` throw `NoSuchElementException`; `SequencedMap.firstEntry()` returns `null`.
- **`LinkedHashSet.addFirst` of an existing element repositions it**; `addLast` likewise moves it to the end.
- **Sorted collections:** `addFirst/addLast/putFirst/putLast` throw `UnsupportedOperationException`.
- **Snapshot entries** from `firstEntry()` etc. throw on `setValue`.
- **Views of views:** `list.reversed().reversed()` behaves like the original list.
- **Migration of custom collections:** a third-party collection class that already declared a method such as `getFirst()` or `reversed()` with an incompatible return type stops compiling against Java 21. JEP 431 discusses these compatibility risks; check custom collection classes when upgrading.

## 15. Interview Questions

**Q1. Why doesn't `HashSet` implement `SequencedSet`?**

<details><summary>Answer</summary>

It has no defined encounter order: iteration order depends on hash codes and capacity and may change after a resize. A "first" element would be meaningless and unstable. `LinkedHashSet` (insertion order) and `SortedSet` implementations (sorted order) do have one.

</details>

**Q2. What does `list.reversed().add(x)` do?**

<details><summary>Answer</summary>

`add` on the reversed view appends to the *view's* end, which is the *original's* beginning — equivalent to `list.addFirst(x)` (O(n) for `ArrayList`). The view is backed by the list, so the change is visible in both.

</details>

**Q3. Why does `TreeSet.addFirst` throw?**

<details><summary>Answer</summary>

A sorted set's encounter order is determined by its comparator; the caller cannot choose a position. `SortedSet` therefore overrides `addFirst`/`addLast` to throw `UnsupportedOperationException`. Use `add`.

</details>

**Q4. What is the difference between `map.firstEntry()` and `map.entrySet().iterator().next()` on a `LinkedHashMap`?**

<details><summary>Answer</summary>

`firstEntry()` returns an unmodifiable snapshot (or `null` when empty); its `setValue` throws. The iterator's entry is connected to the map during iteration — `setValue` writes through — and `next()` throws `NoSuchElementException` on an empty map.

</details>

## 16. Practice Exercise

Write a generic method `lastN(SequencedCollection<T> source, int n)` that returns an unmodifiable list of the last `n` elements in **original order**, without copying the whole collection. Handle `n` larger than the size and negative `n`.

<details><summary>Solution</summary>

```java
static <T> List<T> lastN(SequencedCollection<T> source, int n) {
    if (n < 0) throw new IllegalArgumentException("n must be >= 0: " + n);
    List<T> newestFirst = new ArrayList<>(Math.min(n, source.size()));
    for (T element : source.reversed()) {          // O(1) view, walks from the end
        if (newestFirst.size() == n) break;
        newestFirst.add(element);
    }
    return List.copyOf(newestFirst.reversed());     // back to original order; rejects nulls
}
```

Cost: O(n) for list-like and linked collections (plus O(log size) to start for `TreeSet`), independent of the source size. If the source may contain nulls, replace `List.copyOf(...)` with `Collections.unmodifiableList(new ArrayList<>(newestFirst.reversed()))`.

</details>

## 17. Key Takeaways

- Java 21 added `SequencedCollection`, `SequencedSet`, `SequencedMap` (JEP 431) for collections with a defined encounter order.
- One vocabulary: `getFirst/Last`, `addFirst/Last`, `removeFirst/Last`, `reversed()`; maps get `firstEntry`, `putFirst`, `pollLastEntry`, …
- `reversed()` is an O(1) **view**.
- Behaviour varies: sorted collections reject positional inserts; `LinkedHashSet.addFirst` repositions; `ArrayList.addFirst` is O(n).
- `firstEntry()` and friends return snapshots.

## 18. Official References

- [JEP 431: Sequenced Collections](https://openjdk.org/jeps/431)
- [`java.util.SequencedCollection` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedCollection.html)
- [`java.util.SequencedSet` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedSet.html)
- [`java.util.SequencedMap` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedMap.html)
- [OpenJDK 25 source: `SequencedCollection.java`](https://github.com/openjdk/jdk25u/blob/master/src/java.base/share/classes/java/util/SequencedCollection.java)
