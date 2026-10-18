## 1. Learning Objectives

After this lesson you will be able to:

```objectives
```

## 2. The Problem

Most production defects involving collections are **contract violations**, not algorithm bugs:

- a report that "randomly" changes order because the code assumed `HashSet` iterates in insertion order;
- `UnsupportedOperationException` in production because a method returned `List.of(...)` and a caller tried to `add` to it;
- `NullPointerException` from `List.copyOf` or `Map.of` on data that "never contains nulls";
- a `TreeSet` that silently drops records because the comparator considers two different records equal;
- data corruption in a cache shared between request threads.

Each comes from assuming a guarantee that the collection's contract never made. This lesson teaches you to read contracts — and to separate them from whatever the current JDK happens to do.

## 3. Beginner-Friendly Explanation

A contract is the list of promises written in an interface's documentation. For collections, the important questions are:

1. **Order** — will I get elements back in a predictable order?
2. **Duplicates** — can the same (equal) element appear twice?
3. **Nulls** — may I put `null` in?
4. **Equality** — how does the collection decide two elements are "the same"?
5. **Mutability** — may I add, remove or replace elements?
6. **Thread safety** — may several threads use it at once?

Different collections answer differently. `ArrayList`: ordered, duplicates yes, nulls yes, modifiable, not thread-safe. `List.of(...)`: ordered, duplicates yes, **nulls no**, **not modifiable**, safe to share once built. You must know the answers for every collection you hand to, or receive from, other code.

## 4. Detailed Technical Explanation

### Optional operations

`Collection` declares mutators (`add`, `remove`, `addAll`, `clear`, `retainAll`, `removeIf`…) as **optional operations**: an implementation may throw `UnsupportedOperationException` instead. This keeps the hierarchy small — there is no separate `ReadOnlyList` interface — at the price that the *type* does not tell you whether mutation works.

> [!CONTRACT]
> `Collection.add` returns `true` if the collection changed. A `Set` returns `false` for an element that is already present; a `List` always returns `true`. Implementations "may refuse to add" elements (for example `null`) and must then throw an exception rather than return `false`.

### Ordering

- `List`: elements have positions; iteration is in index order.
- `SequencedCollection` (21+): a defined *encounter order* with first and last.
- `Set`/`Collection`: **no order promised**. `HashSet`'s current iteration order depends on hash codes and table capacity; it can change when the set resizes and between JDK versions.
- `SortedSet`/`SortedMap`: ascending by comparator or natural order.

### Duplicates and equality

Membership is defined by `equals` (and, for hash-based collections, a consistent `hashCode`). Sorted collections are the exception: **`TreeSet` and `TreeMap` use `compareTo`/`compare`**, and treat two elements as duplicates when the comparison returns 0 — even if `equals` returns `false`. The `SortedSet` Javadoc calls such an ordering "inconsistent with equals" and warns that the set then "fails to obey the general contract of `Set`".

`List.equals` is defined as "same elements in the same order"; `Set.equals` as "same size and contains all"; `Map.equals` as "same mappings". So `List.of(1, 2).equals(new ArrayList<>(List.of(1, 2)))` is `true` — equality does not depend on the implementation.

### Null handling

| Collection | Null elements / keys |
|---|---|
| `ArrayList`, `LinkedList`, `HashSet`, `LinkedHashSet` | allowed (one null in a set) |
| `HashMap`, `LinkedHashMap` | one null key, null values |
| `TreeSet` / `TreeMap` with natural ordering | **no** (comparison throws `NullPointerException`); a comparator may permit null |
| `ArrayDeque`, `PriorityQueue` | **no** (`null` is used as a sentinel / cannot be ordered) |
| `List.of`, `Set.of`, `Map.of`, `copyOf`, `Stream.toList()`* | **no** — even `contains(null)` throws for `List.of` / `Set.of` collections |
| `ConcurrentHashMap`, `ConcurrentLinkedQueue`, blocking queues | **no** (null would be ambiguous with "absent") |

\* `Stream.toList()` is the exception in that list: it **allows** null elements, while still returning an unmodifiable list.

### Modifiability: unmodifiable ≠ immutable

- **Modifiable:** `ArrayList`, `HashMap`, … .
- **Unmodifiable view:** `Collections.unmodifiableList(list)` rejects mutators but **reflects changes made to `list`**.
- **Unmodifiable collection:** `List.of`, `List.copyOf`, `Stream.toList()` — no reference to a mutable backing store; contents never change.
- **Fixed-size:** `Arrays.asList(array)` — `set` works (writing through to the array), `add`/`remove` throw.
- **Immutable** in the deep sense requires *also* that the elements are immutable. `List.of(new StringBuilder("x"))` is an unmodifiable list of a mutable object.

### Thread safety

General-purpose collections are **not thread-safe**. The `ArrayList`/`HashMap` Javadoc requires external synchronization if multiple threads access an instance concurrently and at least one modifies it *structurally*. Their iterators are **fail-fast on a best-effort basis**: they throw `ConcurrentModificationException` when they detect modification, but "the fail-fast behavior of an iterator cannot be guaranteed" — so it is a bug detector, not a concurrency control. Thread-safe alternatives are in Module 23.

## 5. Internal Implementation

How implementations enforce their contracts:

- **Rejecting nulls:** the immutable collections call `Objects.requireNonNull` on every element at creation and in `contains`/`indexOf`; `ArrayDeque.addLast` checks `e == null` and throws.
- **Rejecting duplicates in `Set.of`:** the factory throws `IllegalArgumentException` for duplicate elements instead of silently de-duplicating (`Set.copyOf` *does* de-duplicate).
- **Detecting concurrent modification:** most `java.util` collections keep an `int modCount` incremented on every structural change. Iterators copy it into `expectedModCount` and compare on each `next()`. Not volatile, not synchronized — which is precisely why detection is best-effort across threads.
- **Unsupported operations:** `AbstractList.add` throws `UnsupportedOperationException` by default; subclasses that support it override.

## 6. Memory Representation

```text
Collections.unmodifiableList(src)          List.copyOf(src)
┌────────────────────┐                     ┌──────────────────────┐
│ UnmodifiableList   │── wraps ──► src     │ ImmutableCollections │  own array:
│ (view, no copy)    │   (still mutable    │ .ListN               │  [e0][e1][e2]
└────────────────────┘    by its owner)    └──────────────────────┘  (copied at creation)
     O(1) memory, changes to src visible        O(n) memory, snapshot; elements shared

Arrays.asList(array) ── fixed-size List view ──► the SAME array: set() writes through
```

`List.copyOf` copies **references**, not elements: a snapshot of which objects are in the list, not of their state.

## 7. Runnable Java Example

```example
m03/ContractProbe
```

## 8. Execution Walkthrough

1. `report` adds `"A"` twice and then `null` to each collection, printing the return value or the exception type.
2. `ArrayList` accepts the duplicate (`true`) and `null`.
3. `HashSet` rejects the duplicate by returning `false` — not an exception — and accepts one `null`.
4. `TreeSet` with natural ordering rejects the duplicate (`compareTo` returns 0) and throws `NullPointerException` for `null`, because it must compare `null` with `"A"`.
5. `ArrayDeque` accepts duplicates but throws on `null`; `ConcurrentHashMap.newKeySet()` rejects both duplicates (`false`) and `null` (exception).
6. `List.of(...)` throws `UnsupportedOperationException` on `add`, and — surprisingly to many — `NullPointerException` even for `contains(null)`.
7. `Set.of("A", "A")` throws `IllegalArgumentException`: duplicate elements are a programming error for the factory.
8. `Arrays.asList` allows `set` (returns the old value `A`) but not `add`.

## 9. Complexity Analysis

Contracts and costs are separate questions, but some contract choices imply costs:

| Operation | Cost | Why |
|---|---|---|
| `Collections.unmodifiableList(l)` | O(1) | wraps, no copy |
| `List.copyOf(c)` | O(n); O(1) if `c` is already an immutable list | copies references, checks nulls |
| `Set.copyOf(c)` | O(n) expected | hashes every element, removes duplicates |
| `new ArrayList<>(c)` | O(n) | copies into a new array |
| fail-fast check | O(1) per `next()` | one `int` comparison |

## 10. Incorrect Implementation

```java
// 1. Relying on HashSet order in an API response
Set<String> roles = new HashSet<>(user.roles());
return String.join(",", roles);                 // order may differ between runs, JDKs, capacities

// 2. Returning an unmodifiable list to a caller that mutates it
public List<Item> items() { return List.of(a, b); }
...
cart.items().add(c);                            // UnsupportedOperationException at runtime

// 3. A comparator that makes distinct records "equal"
Set<Employee> byName = new TreeSet<>(Comparator.comparing(Employee::lastName));
byName.add(new Employee(1, "Rao"));
byName.add(new Employee(2, "Rao"));             // silently NOT added: compare(...) == 0
```

## 11. Correct Implementation

```java
// 1. State the order you need
Set<String> roles = new TreeSet<>(user.roles());       // sorted, deterministic
// or new LinkedHashSet<>(...) for first-seen order

// 2. Document and honour ownership
/** Returns an unmodifiable snapshot of the items. */
public List<Item> items() { return List.copyOf(items); }
...
List<Item> mine = new ArrayList<>(cart.items());       // caller copies if it wants to modify
mine.add(c);

// 3. Make the comparator total over the identity of the record
Set<Employee> byName = new TreeSet<>(
        Comparator.comparing(Employee::lastName).thenComparing(Employee::id));
```

The third fix makes `compare` return 0 only for the same employee, so the ordering is consistent with equals for records that compare all components.

## 12. Enterprise Use Case

**API boundary of a Spring service.** A `CustomerService.findAll()` returns `List<CustomerDto>` built from a repository result:

```java
public List<CustomerDto> findAll() {
    return repository.findAll().stream()
            .map(mapper::toDto)
            .toList();                         // unmodifiable; allows nulls (none expected here)
}
```

Documenting "returns an unmodifiable list" lets callers rely on the snapshot not changing underneath them, and prevents a controller from accidentally mutating a cached list shared across requests. Inside the service, a mutable `ArrayList` is fine — the contract matters at the **boundary**.

**Shared configuration.** A `Map<String, FeatureFlag>` loaded at startup and read by all request threads should be published as `Map.copyOf(loaded)`: unmodifiable, with no mutable backing map, and safely shared after construction (provided the reference is published safely, e.g. via a `final` field). The `FeatureFlag` objects must be immutable too — `Map.copyOf` does not make them so.

## 13. Alternatives and Trade-offs

- **Unmodifiable view vs copy:** a view is free and always current; a copy is a stable snapshot that costs O(n). Return a copy when the caller must not observe later changes.
- **`Stream.toList()` vs `Collectors.toList()`:** the former is unmodifiable and allows nulls; the latter currently returns an `ArrayList`, but its Javadoc gives "no guarantees on the type, mutability, serializability, or thread-safety".
- **`Collections.synchronizedList` vs concurrent collections:** the wrapper synchronizes each call but compound actions (check-then-act, iteration) still need external locking.
- **Defensive copying on input** (`List.copyOf(param)`) protects your object's invariants from callers who keep mutating what they passed you.

## 14. Edge Cases

- **`List.of().contains(null)` throws** `NullPointerException`; `new ArrayList<>().contains(null)` returns `false`. Code that checks "does the list contain null?" must know which it has.
- **`Set.of` with duplicates throws**, `Set.copyOf` de-duplicates silently.
- **`Map.of` supports at most 10 key-value pairs** as arguments; use `Map.ofEntries` beyond that.
- **Second-to-last removal:** removing the second-to-last element of an `ArrayList` inside a for-each loop does *not* throw, because `hasNext()` returns `false` first — fail-fast has blind spots (tested in `ListExamplesTest`).
- **`Arrays.asList(int[])`** produces a `List<int[]>` with one element, not a list of integers.
- **`equals` across implementations:** an `ArrayList` and a `LinkedList` with the same elements are equal; a `List` is never equal to a `Set`.

## 15. Interview Questions

**Q1. What is the difference between an unmodifiable view and an immutable collection?**

<details><summary>Answer</summary>

An unmodifiable view (`Collections.unmodifiableList`) blocks mutation *through the view* but still reflects changes made to the underlying collection by whoever owns it. An unmodifiable collection like `List.copyOf` has no backing mutable collection, so its contents (the references) never change. Neither makes the *elements* immutable. *Follow-up:* which to return from a getter? Usually a copy, or a view if the class never mutates after construction and you want O(1).

</details>

**Q2. Why can a `TreeSet` lose elements that are not equal?**

<details><summary>Answer</summary>

`TreeSet` decides membership with `compareTo`/`compare`. If the comparator returns 0 for two non-equal elements (e.g. comparing only by last name), the second is considered a duplicate and `add` returns `false`. The set then violates the general `Set` contract (which is defined in terms of `equals`). Fix by making the ordering consistent with equals, e.g. with a tie-breaker on a unique ID.

</details>

**Q3. Does `ConcurrentModificationException` mean another thread modified the collection?**

<details><summary>Answer</summary>

Not necessarily. Most often the same thread modified the collection while iterating it (e.g. `list.remove` inside a for-each). And when another thread *does* modify it, the exception is not guaranteed — detection is best-effort, so absence of the exception proves nothing about thread safety.

</details>

**Q4. Why do `ConcurrentHashMap` and `List.of` reject null?**

<details><summary>Answer</summary>

For `ConcurrentHashMap`, `get` returning `null` must unambiguously mean "absent", because a separate `containsKey` check could be invalidated by another thread. For the immutable factories, rejecting nulls catches bugs early and lets `null` never be a legal element, simplifying the implementation.

</details>

## 16. Practice Exercise

Predict the result (value or exception) of each line, then explain it:

```java
List<String> a = Arrays.asList("x", "y");
List<String> b = List.of("x", "y");
List<String> c = Collections.unmodifiableList(new ArrayList<>(a));
List<String> d = Stream.of("x", null).toList();

a.set(0, "z");            // (1)
b.set(0, "z");            // (2)
c.contains(null);         // (3)
b.contains(null);         // (4)
d.size();                 // (5)
a.equals(List.of("z", "y")); // (6)
```

<details><summary>Solution</summary>

1. Returns `"x"`; `Arrays.asList` is fixed-size but allows `set` (writes through to the array).
2. `UnsupportedOperationException`: `List.of` is unmodifiable.
3. `false`: the view delegates to `ArrayList.contains`, which handles null.
4. `NullPointerException`: `List.of` collections reject null even in queries.
5. `2`: `Stream.toList()` allows null elements.
6. `true`: `List.equals` compares elements in order, regardless of implementation.

</details>

## 17. Key Takeaways

- Read the **contract**, not the current behaviour: order, duplicates, nulls, equality, mutability, thread safety.
- Mutators are **optional operations**; `UnsupportedOperationException` is legitimate behaviour.
- Sorted collections use **comparison**, not `equals`, for membership.
- Unmodifiable ≠ immutable; views ≠ copies; elements may still be mutable.
- Fail-fast iteration is a best-effort **bug detector**, not thread safety.

## 18. Official References

- [`java.util.Collection` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Collection.html) — optional operations, views, unmodifiable collections.
- [`java.util.List` — Unmodifiable Lists](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html#unmodifiable)
- [`java.util.SortedSet` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SortedSet.html) — consistency with equals.
- [`java.util.ConcurrentModificationException` (Java 25 API)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ConcurrentModificationException.html)
- [`java.util.stream.Stream#toList()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html#toList())
- [`java.util.stream.Collectors#toList()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Collectors.html#toList())
