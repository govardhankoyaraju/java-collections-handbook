## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Before Java 1.2, Java had `Vector`, `Hashtable`, `Stack` and arrays — each with its own method names and no common type. Code that accepted a `Vector` could not accept a `Hashtable`'s keys; replacing one structure with another meant rewriting every caller; algorithms such as sorting had to be written once per container.

The Collections Framework (JDK 1.2, designed by Josh Bloch) solved this with a **small set of interfaces describing behaviour** and **many implementations behind them**. Today the problem looks different but is the same at heart: a service method that declares `ArrayList<Order>` as its parameter type forces every caller to build exactly an `ArrayList`, and a field declared as `HashMap` cannot later become a `LinkedHashMap` without a ripple of changes. Knowing the hierarchy is how you choose the right *type to depend on*.

## 3. Beginner-Friendly Explanation

Think of the interfaces as **job descriptions** and the classes as **employees**.

- `Collection` — "can hold a group of things, tell you how many, and let you look at each one".
- `List` — "…and keeps them in positions 0, 1, 2…; duplicates are fine".
- `Set` — "…and never holds two equal things".
- `Queue` / `Deque` — "…and hands them out from the front (or either end)".
- `Map` — a different job altogether: "look up a value by its key".

`ArrayList`, `LinkedList`, `HashSet`, `TreeMap` are employees who can do those jobs, each with different strengths. When you write code, you ask for the *job* (`List<Order>`), not a particular employee (`ArrayList<Order>`), so any suitable employee can be hired.

## 4. Detailed Technical Explanation

### The interfaces (Java 21–25)

| Interface | Extends | Adds | Since |
|---|---|---|---|
| `Iterable<T>` (java.lang) | — | `iterator()`, `forEach`, `spliterator`; enables the enhanced `for` loop | 1.5 |
| `Collection<E>` | `Iterable` | `size`, `contains`, `add`/`remove` (optional), bulk ops, `stream()`, `toArray` | 1.2 |
| `SequencedCollection<E>` | `Collection` | defined encounter order: `getFirst/Last`, `addFirst/Last`, `removeFirst/Last`, `reversed()` | **21** |
| `List<E>` | `SequencedCollection` (since 21; `Collection` before) | positional access `get(i)`, `set`, `add(i, e)`, `indexOf`, `subList`, `listIterator`, `sort` | 1.2 |
| `Set<E>` | `Collection` | no duplicate elements (by `equals`) | 1.2 |
| `SequencedSet<E>` | `SequencedCollection`, `Set` | an ordered set whose `reversed()` is a `SequencedSet` | **21** |
| `SortedSet<E>` | `Set`, `SequencedSet` (since 21) | ascending order; `first`, `last`, `headSet`, `tailSet`, `subSet` | 1.2 |
| `NavigableSet<E>` | `SortedSet` | `lower`, `floor`, `ceiling`, `higher`, `pollFirst`, `descendingSet` | 1.6 |
| `Queue<E>` | `Collection` | `offer`/`poll`/`peek` and the throwing `add`/`remove`/`element` | 1.5 |
| `Deque<E>` | `Queue`, `SequencedCollection` (since 21) | both-ends operations; `push`/`pop` stack operations | 1.6 |
| `Map<K,V>` | — (not a `Collection`) | `get`, `put`, `remove`, `containsKey`, views, `compute`/`merge` | 1.2 |
| `SequencedMap<K,V>` | `Map` | `firstEntry`, `putFirst`, `pollLastEntry`, `reversed()`, sequenced views | **21** |
| `SortedMap<K,V>` | `SequencedMap` (since 21; `Map` before) | `firstKey`, `lastKey`, `headMap`, `tailMap`, `subMap` | 1.2 |
| `NavigableMap<K,V>` | `SortedMap` | `floorKey`, `ceilingEntry`, `descendingMap`, `pollFirstEntry`… | 1.6 |

Concurrent interfaces (`BlockingQueue`, `ConcurrentMap`, `ConcurrentNavigableMap`) live in `java.util.concurrent` and extend these.

### Implementation families

- **General-purpose:** `ArrayList`, `LinkedList`, `ArrayDeque`, `PriorityQueue`, `HashSet`, `LinkedHashSet`, `TreeSet`, `HashMap`, `LinkedHashMap`, `TreeMap`. Not thread-safe, permit (most) nulls, cover nearly all needs.
- **Specialized:** `EnumSet`, `EnumMap`, `IdentityHashMap`, `WeakHashMap`, `BitSet` (not a `Collection`) — solve one problem extremely well.
- **Concurrent:** `ConcurrentHashMap`, `CopyOnWriteArrayList`, `ConcurrentLinkedQueue`, `ArrayBlockingQueue`, `ConcurrentSkipListMap/Set`.
- **Legacy:** `Vector`, `Stack`, `Hashtable` (and `Properties`), retrofitted into the framework in 1.2. Each method is synchronized; prefer modern alternatives.
- **Immutable/unmodifiable:** `List.of`, `Set.of`, `Map.of` (Java 9+), `copyOf` (Java 10+), `Collections.unmodifiable*` views. Their concrete classes are private; you only see the interfaces.
- **Skeletal implementations:** `AbstractCollection`, `AbstractList`, `AbstractSet`, `AbstractMap`, `AbstractQueue`, `AbstractSequentialList` make writing your own collection a matter of a few methods.

### Programming to interfaces

Declare variables, fields, parameters and return types with the **narrowest interface that expresses what the code needs**:

- needs only iteration → `Iterable<T>` or `Collection<T>`;
- needs positions or duplicates with order → `List<T>`;
- needs uniqueness → `Set<T>`;
- needs first/last on any ordered collection → `SequencedCollection<T>` (21+);
- needs sorted navigation → `NavigableMap<K,V>`.

Choose the implementation **once**, where the object is created.

> [!CONTRACT]
> A method's declared type is a promise to callers. Returning `List<Order>` promises order and positional access; returning `Collection<Order>` promises less and leaves you free to change the implementation later. Accept the most general type you can use; return the most specific type callers legitimately need.

## 5. Internal Implementation

Interfaces carry behaviour through **default methods** (Java 8+). `Collection.removeIf`, `Iterable.forEach`, `Map.computeIfAbsent`, `Map.merge` and all of `SequencedCollection`'s methods except `reversed()` have default implementations written purely in terms of other interface methods. Implementations override them when they can do better: `ArrayList.removeIf` compacts the array in one pass; `HashMap.computeIfAbsent` avoids hashing the key twice.

Java 21 retrofitted the sequenced interfaces *into the middle* of the existing hierarchy (JEP 431). Because they were added with default methods, existing third-party `List` implementations kept compiling. `List.reversed()` has a default implementation; `SequencedCollection.reversed()` itself is abstract, and `List`, `Deque`, `LinkedHashSet`, `SortedSet` and friends provide one.

`RandomAccess` is a **marker interface** with no methods. `ArrayList` and `Vector` implement it; `LinkedList` does not. Generic algorithms (for example in `java.util.Collections`) check `list instanceof RandomAccess` to choose between index-based and iterator-based loops.

## 6. Memory Representation

The interface hierarchy has no runtime cost per element — interfaces describe behaviour, objects carry the data. Programming to an interface adds no memory, and modern JITs devirtualise most interface calls on monomorphic call sites (an implementation detail of HotSpot).

```text
                    Iterable
                       │
                   Collection ───────────────────────┐
         ┌─────────────┼─────────────┐               │
 SequencedCollection   Set          Queue             │        Map (separate root)
   │      │       │     │             │               │         │
  List  Deque  SequencedSet          Deque           │     SequencedMap
          (Queue+Seq)  │                              │         │
                    SortedSet                         │      SortedMap
                       │                              │         │
                  NavigableSet                        │    NavigableMap
```

Explore it interactively — select a type to highlight everything it is assignable to:

```viz
hierarchy
```

## 7. Runnable Java Example

```example
m03/HierarchyTour
```

## 8. Execution Walkthrough

1. The program instantiates ten common implementations and tests each against fourteen interfaces with `instanceof`.
2. `ArrayList` is a `List`, therefore a `SequencedCollection` (Java 21+), and is `RandomAccess`.
3. `LinkedList` is both a `List` and a `Deque` — one of the few classes in two branches — and is **not** `RandomAccess`.
4. `PriorityQueue` is a `Queue` but **not** a `SequencedCollection`: its iteration order is not its priority order, so it has no meaningful first/last.
5. `HashSet` is a plain `Set` (no encounter order), `LinkedHashSet` is a `SequencedSet`, `TreeSet` is all the way down to `NavigableSet`.
6. `HashMap` is only a `Map`; `LinkedHashMap` adds `SequencedMap`; `TreeMap` is a `NavigableMap`. None of them is a `Collection`.

## 9. Complexity Analysis

Interfaces have no complexity; **implementations** do. The same call can cost very different amounts:

| Call | `ArrayList` | `LinkedList` | `HashSet` | `TreeSet` |
|---|---|---|---|---|
| `contains(x)` | O(n) | O(n) | O(1) expected | O(log n) |
| `get(i)` (List only) | O(1) | O(n) | — | — |
| `getFirst()` (21+) | O(1) | O(1) | — (not sequenced) | O(log n) |

This is why a method that receives a `List` and calls `get(i)` in a loop is a performance hazard: correct for an `ArrayList`, quadratic for a `LinkedList`. Either iterate, or check `RandomAccess`.

## 10. Incorrect Implementation

```java
public class ReportService {
    // Leaks the implementation into every caller and every subclass.
    public ArrayList<ReportLine> buildLines(HashMap<String, Customer> customers) { ... }

    // Field type fixes the ordering policy forever.
    private HashMap<String, ReportLine> linesById = new HashMap<>();
}
```

Callers holding a `LinkedHashMap` or an immutable `Map.copyOf(...)` must convert before calling, and switching the field to `LinkedHashMap` to make output deterministic touches every method that uses it.

## 11. Correct Implementation

```java
public class ReportService {
    public List<ReportLine> buildLines(Map<String, Customer> customers) { ... } // accepts any Map

    private final Map<String, ReportLine> linesById = new LinkedHashMap<>();    // choice made once
}
```

The parameter accepts any `Map` the caller already has; the return type promises an ordered `List`; the field's ordering policy is a one-line decision. If callers only iterate the result, `Collection<ReportLine>` or even `Iterable<ReportLine>` would be acceptable — but a `List` is usually more useful to callers and still hides the implementation.

## 12. Enterprise Use Case

In a Spring Boot service layer:

```java
public interface OrderQueryService {
    List<OrderSummary> findRecent(CustomerId customer, int limit);   // ordered result
    Set<String> distinctSkus(Collection<OrderId> orderIds);          // any collection of IDs in
    Map<Status, Long> countByStatus(LocalDate day);                  // implementation hidden
}
```

- Repositories (Spring Data) return `List<T>`; the service can transform with streams and return `List.copyOf(...)` (unmodifiable) without changing its signature.
- `countByStatus` can internally use an `EnumMap<Status, Long>` — compact and ordered by declaration — while callers see a `Map`.
- Accepting `Collection<OrderId>` lets controllers pass a `Set` parsed from query parameters or a `List` from a request body.

## 13. Alternatives and Trade-offs

- **Concrete types in signatures** are justified when callers need implementation-specific guarantees that no interface expresses — rare since Java 21 added sequenced interfaces (before 21, returning `LinkedHashMap` was a way to promise order; now `SequencedMap` does it).
- **Very general types** (`Iterable`) maximise flexibility but deny callers `size()` and `stream()`.
- **Arrays** remain appropriate for fixed-size primitive data and varargs; they do not participate in the hierarchy.
- **Third-party collection libraries** (Guava, Eclipse Collections) add interfaces such as `Multimap`; prefer JDK interfaces at public API boundaries.

## 14. Edge Cases

- **Optional operations:** a `List` may reject `add` with `UnsupportedOperationException` (`List.of`, `Arrays.asList`). The interface type does not tell you; documentation does. See [Collection Contracts](/learn/collections-architecture/collection-contracts).
- **`PriorityQueue` is not sequenced** — it does not have `getFirst()`; use `peek()`.
- **`LinkedList` in two branches** — overload resolution can surprise you: `remove(int)` (List) vs `remove(Object)`; `remove()` (Deque/Queue head).
- **`Map` is not `Iterable`** — iterate `entrySet()`, `keySet()` or `values()`.
- **Java 17 code:** `SequencedCollection` does not exist; code that must run on 17 cannot depend on it.

## 15. Interview Questions

**Q1. Why should you declare `List<String> names = new ArrayList<>();` rather than `ArrayList<String> names = ...`?**

<details><summary>Answer</summary>

The code then depends only on the `List` contract, so the implementation can be changed in one place, and no `ArrayList`-specific method (`ensureCapacity`, `trimToSize`) leaks into the code. The cost is nil at runtime. Exception: when you genuinely use implementation-specific methods, a local variable of the concrete type is fine — keep it out of public signatures.

</details>

**Q2. Which class implements both `List` and `Deque`, and what should you watch for?**

<details><summary>Answer</summary>

`LinkedList`. Watch for overloaded methods with different meanings (`remove()` removes the head; `remove(int)` removes by index; `remove(Object)` by equality), for O(n) indexed access despite being a `List`, and for nulls being allowed (unlike `ArrayDeque`).

</details>

**Q3. What did Java 21 change in the hierarchy?**

<details><summary>Answer</summary>

JEP 431 added `SequencedCollection`, `SequencedSet` and `SequencedMap`. `List` and `Deque` now extend `SequencedCollection`; `LinkedHashSet` implements `SequencedSet`; `SortedSet` extends `SequencedSet`; `LinkedHashMap` implements `SequencedMap`; `SortedMap` extends `SequencedMap`. Methods were added as defaults, preserving compatibility. *Follow-up:* "Why isn't `HashSet` sequenced?" — it has no defined encounter order.

</details>

**Q4. What is `RandomAccess` for?**

<details><summary>Answer</summary>

A marker interface signalling that indexed access is fast (roughly constant time). Generic algorithms check it to decide between index loops and iterators. `ArrayList` and `Vector` implement it; `LinkedList` does not.

</details>

## 16. Practice Exercise

Refactor this method signature and body so that it accepts any source of product codes, preserves first-seen order, removes duplicates, and returns a result that callers cannot modify. State the narrowest parameter type that works.

```java
public ArrayList<String> normalise(ArrayList<String> codes) {
    ArrayList<String> out = new ArrayList<>();
    for (String c : codes) {
        String n = c.trim().toUpperCase(Locale.ROOT);
        if (!out.contains(n)) out.add(n);
    }
    return out;
}
```

<details><summary>Solution</summary>

```java
public List<String> normalise(Iterable<String> codes) {
    Set<String> unique = new LinkedHashSet<>();          // order of first appearance, O(1) expected membership
    for (String c : codes) {
        unique.add(c.trim().toUpperCase(Locale.ROOT));
    }
    return List.copyOf(unique);                          // unmodifiable; rejects null elements
}
```

`Iterable<String>` is the narrowest type that supports a for-each loop. The original was also O(n²) because of `out.contains`. Note `List.copyOf` throws `NullPointerException` for null elements — but `c.trim()` would already have thrown for a null code, so behaviour for nulls is unchanged.

</details>

## 17. Key Takeaways

- Interfaces describe **behaviour**; implementations decide **cost and guarantees**.
- `Map` is a separate root; it is not a `Collection` (next lessons explain why).
- Java 21 inserted `SequencedCollection`/`SequencedSet`/`SequencedMap` into the hierarchy.
- Program to the narrowest useful interface; choose implementations once, at creation.
- Implementation families: general-purpose, specialized, concurrent, legacy, immutable.

## 18. Official References

- [Collections Framework overview (Java 25)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [`java.util` package summary (Java 25)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/package-summary.html)
- [JEP 431: Sequenced Collections](https://openjdk.org/jeps/431)
- [`java.util.RandomAccess` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/RandomAccess.html)
- [Java Collections Framework guide (Java 25 Core Libraries)](https://docs.oracle.com/en/java/javase/25/core/java-collections-framework.html)
