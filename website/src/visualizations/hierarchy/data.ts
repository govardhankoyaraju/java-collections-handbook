/**
 * The java.util collection type hierarchy as of Java 21–25 (verified against the JDK 25 sources
 * and by java-examples HierarchyTour). Only direct supertypes that matter for learning are listed;
 * marker interfaces such as Cloneable and Serializable are omitted.
 */

export type NodeKind = 'interface' | 'class' | 'abstract-class';
export type Family = 'core' | 'sequenced' | 'general' | 'specialized' | 'concurrent' | 'legacy';

export interface HierarchyNode {
  id: string;
  kind: NodeKind;
  family: Family;
  pkg: 'java.lang' | 'java.util' | 'java.util.concurrent';
  since: string;
  /** Direct supertypes shown in the explorer: interfaces it extends/implements, or a superclass that is itself in the explorer. */
  supertypes: string[];
  /** Skeletal/legacy superclass not shown as a node (AbstractList, Dictionary, ...). */
  superclass?: string;
  /** Parent used to place the node in the tree view. */
  primaryParent: string | null;
  summary: string;
  ordering?: string;
  duplicates?: string;
  nulls?: string;
  threadSafety?: string;
  /** Lesson id with a deeper explanation, if published. */
  lesson?: string;
}

export const hierarchy: HierarchyNode[] = [
  { id: 'Iterable', kind: 'interface', family: 'core', pkg: 'java.lang', since: '1.5', supertypes: [], primaryParent: null,
    summary: 'Anything that can produce an Iterator; enables the enhanced for loop. Not part of java.util but the root of every Collection.' },
  { id: 'Collection', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: ['Iterable'], primaryParent: 'Iterable',
    summary: 'A group of elements. Defines size, contains, add/remove (optional operations), bulk operations, iterator, stream. Says nothing about order or duplicates.',
    lesson: 'm03-contracts' },
  { id: 'SequencedCollection', kind: 'interface', family: 'sequenced', pkg: 'java.util', since: '21', supertypes: ['Collection'], primaryParent: 'Collection',
    summary: 'A Collection with a defined encounter order: getFirst/getLast, addFirst/addLast, removeFirst/removeLast and a reversed() view (JEP 431).',
    ordering: 'Defined encounter order', lesson: 'm03-sequenced' },
  { id: 'List', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: ['SequencedCollection'], primaryParent: 'SequencedCollection',
    summary: 'An ordered sequence with positional (index) access. Allows duplicates. Since Java 21 it extends SequencedCollection (previously Collection).',
    ordering: 'Positional', duplicates: 'Allowed', nulls: 'Implementation-dependent', lesson: 'm05-arraylist-internals' },
  { id: 'Set', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: ['Collection'], primaryParent: 'Collection',
    summary: 'No two elements e1, e2 with e1.equals(e2). Membership is defined by equals (or by a comparator for sorted sets).',
    duplicates: 'Not allowed', ordering: 'None promised by Set itself' },
  { id: 'SequencedSet', kind: 'interface', family: 'sequenced', pkg: 'java.util', since: '21', supertypes: ['SequencedCollection', 'Set'], primaryParent: 'Set',
    summary: 'A Set with encounter order; reversed() returns a SequencedSet.', lesson: 'm03-sequenced' },
  { id: 'SortedSet', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: ['Set', 'SequencedSet'], primaryParent: 'SequencedSet',
    summary: 'Elements kept in ascending order by natural ordering or a Comparator; first(), last(), headSet/tailSet/subSet range views. addFirst/addLast throw UnsupportedOperationException.',
    ordering: 'Sorted' },
  { id: 'NavigableSet', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.6', supertypes: ['SortedSet'], primaryParent: 'SortedSet',
    summary: 'Adds closest-match navigation: lower, floor, ceiling, higher, pollFirst/pollLast, descendingSet.', ordering: 'Sorted' },
  { id: 'Queue', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.5', supertypes: ['Collection'], primaryParent: 'Collection',
    summary: 'Holds elements prior to processing. Two method families: add/remove/element throw on failure; offer/poll/peek return a special value.' },
  { id: 'Deque', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.6', supertypes: ['Queue', 'SequencedCollection'], primaryParent: 'Queue',
    summary: 'Double-ended queue: insert/remove at both ends; also the recommended stack abstraction (push/pop).', ordering: 'Encounter order (head to tail)' },
  { id: 'Map', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: [], primaryParent: null,
    summary: 'Maps unique keys to values. Deliberately NOT a Collection; it exposes keySet(), values() and entrySet() collection views.',
    duplicates: 'Unique keys; values may repeat', lesson: 'm03-maps-and-views' },
  { id: 'SequencedMap', kind: 'interface', family: 'sequenced', pkg: 'java.util', since: '21', supertypes: ['Map'], primaryParent: 'Map',
    summary: 'A Map with encounter order: firstEntry/lastEntry, pollFirstEntry/pollLastEntry, putFirst/putLast, reversed() and sequenced views.',
    lesson: 'm03-sequenced' },
  { id: 'SortedMap', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.2', supertypes: ['SequencedMap'], primaryParent: 'SequencedMap',
    summary: 'Keys in ascending order; firstKey/lastKey and headMap/tailMap/subMap range views. Extends SequencedMap since Java 21 (previously Map).', ordering: 'Sorted by key' },
  { id: 'NavigableMap', kind: 'interface', family: 'core', pkg: 'java.util', since: '1.6', supertypes: ['SortedMap'], primaryParent: 'SortedMap',
    summary: 'Adds lowerKey/floorKey/ceilingKey/higherKey (and Entry variants), descendingMap, pollFirstEntry.', ordering: 'Sorted by key' },

  { id: 'BlockingQueue', kind: 'interface', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['Queue'], primaryParent: 'Queue',
    summary: 'A Queue whose put/take block until space or an element is available; the producer–consumer abstraction.', nulls: 'Not allowed', threadSafety: 'Implementations are thread-safe' },
  { id: 'ConcurrentMap', kind: 'interface', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['Map'], primaryParent: 'Map',
    summary: 'A Map whose putIfAbsent/remove/replace/compute/merge are atomic and memory-consistent.', threadSafety: 'Implementations are thread-safe' },
  { id: 'ConcurrentNavigableMap', kind: 'interface', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.6', supertypes: ['ConcurrentMap', 'NavigableMap'], primaryParent: 'ConcurrentMap',
    summary: 'A ConcurrentMap that is also a NavigableMap (and whose navigable sub-maps are concurrent).', threadSafety: 'Implementations are thread-safe' },

  // Implementations
  { id: 'ArrayList', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['List', 'RandomAccess'], superclass: 'AbstractList', primaryParent: 'List',
    summary: 'Resizable array. O(1) indexed access, amortized O(1) append, O(n) insert/remove in the middle. The default List.',
    ordering: 'Positional', duplicates: 'Allowed', nulls: 'Allowed', threadSafety: 'Not thread-safe; fail-fast iterators', lesson: 'm05-arraylist-internals' },
  { id: 'LinkedList', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['List', 'Deque'], superclass: 'AbstractSequentialList', primaryParent: 'List',
    summary: 'Doubly linked list implementing both List and Deque. O(1) at the ends, O(n) to reach an index; high per-element overhead.',
    ordering: 'Positional', duplicates: 'Allowed', nulls: 'Allowed', threadSafety: 'Not thread-safe', lesson: 'm05-arraylist-vs-linkedlist' },
  { id: 'Vector', kind: 'class', family: 'legacy', pkg: 'java.util', since: '1.0', supertypes: ['List', 'RandomAccess'], superclass: 'AbstractList', primaryParent: 'List',
    summary: 'Legacy synchronized resizable array (doubles by default). Each method is synchronized; compound actions still need external locking.',
    nulls: 'Allowed', threadSafety: 'Per-method synchronized' },
  { id: 'Stack', kind: 'class', family: 'legacy', pkg: 'java.util', since: '1.0', supertypes: ['Vector'], primaryParent: 'Vector',
    summary: 'Legacy LIFO stack extending Vector. Prefer ArrayDeque (Deque.push/pop).', threadSafety: 'Per-method synchronized' },
  { id: 'CopyOnWriteArrayList', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['List', 'RandomAccess'], primaryParent: 'List',
    summary: 'Thread-safe list that copies the array on every write; iterators see an immutable snapshot. For read-mostly lists such as listener registries.',
    nulls: 'Allowed', threadSafety: 'Thread-safe; snapshot iterators' },
  { id: 'HashSet', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['Set'], superclass: 'AbstractSet', primaryParent: 'Set',
    summary: 'Hash-based set backed by a HashMap (elements are keys). O(1) average add/contains/remove; no order promised.',
    ordering: 'Unspecified', duplicates: 'Not allowed', nulls: 'One null', threadSafety: 'Not thread-safe' },
  { id: 'LinkedHashSet', kind: 'class', family: 'general', pkg: 'java.util', since: '1.4', supertypes: ['HashSet', 'SequencedSet'], primaryParent: 'SequencedSet',
    summary: 'HashSet plus a linked list giving insertion order. Implements SequencedSet since Java 21.',
    ordering: 'Insertion order', duplicates: 'Not allowed', nulls: 'One null', threadSafety: 'Not thread-safe' },
  { id: 'TreeSet', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['NavigableSet'], superclass: 'AbstractSet', primaryParent: 'NavigableSet',
    summary: 'Red-black tree (backed by a TreeMap). O(log n) operations, sorted iteration, range views. Uniqueness is decided by compareTo/compare, not equals.',
    ordering: 'Sorted', duplicates: 'Not allowed (by comparison)', nulls: 'Not with natural ordering', threadSafety: 'Not thread-safe' },
  { id: 'EnumSet', kind: 'abstract-class', family: 'specialized', pkg: 'java.util', since: '1.5', supertypes: ['Set'], superclass: 'AbstractSet', primaryParent: 'Set',
    summary: 'Bit-vector set for enum constants; extremely compact and fast. Iterates in declaration order.', ordering: 'Enum declaration order', nulls: 'Not allowed' },
  { id: 'ConcurrentSkipListSet', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.6', supertypes: ['NavigableSet'], primaryParent: 'NavigableSet',
    summary: 'Concurrent sorted set based on a skip list; weakly consistent iterators.', nulls: 'Not allowed', threadSafety: 'Thread-safe' },
  { id: 'ArrayDeque', kind: 'class', family: 'general', pkg: 'java.util', since: '1.6', supertypes: ['Deque'], superclass: 'AbstractCollection', primaryParent: 'Deque',
    summary: 'Resizable circular array deque. The default choice for stacks and FIFO queues in single-threaded code.', nulls: 'Not allowed', threadSafety: 'Not thread-safe' },
  { id: 'PriorityQueue', kind: 'class', family: 'general', pkg: 'java.util', since: '1.5', supertypes: ['Queue'], superclass: 'AbstractQueue', primaryParent: 'Queue',
    summary: 'Binary heap ordered by natural ordering or a Comparator. O(log n) offer/poll, O(1) peek; iteration order is NOT sorted.', nulls: 'Not allowed', threadSafety: 'Not thread-safe' },
  { id: 'ArrayBlockingQueue', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['BlockingQueue'], superclass: 'AbstractQueue', primaryParent: 'BlockingQueue',
    summary: 'Bounded blocking FIFO queue backed by an array; for producer–consumer hand-off.', nulls: 'Not allowed', threadSafety: 'Thread-safe' },
  { id: 'ConcurrentLinkedQueue', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['Queue'], superclass: 'AbstractQueue', primaryParent: 'Queue',
    summary: 'Unbounded lock-free FIFO queue; weakly consistent iterators.', nulls: 'Not allowed', threadSafety: 'Thread-safe' },
  { id: 'HashMap', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['Map'], superclass: 'AbstractMap', primaryParent: 'Map',
    summary: 'Hash table of buckets with chains that may become red-black trees. O(1) average get/put; iteration order unspecified.',
    ordering: 'Unspecified', nulls: 'One null key, null values', threadSafety: 'Not thread-safe', lesson: 'm07-hashmap-hashing' },
  { id: 'LinkedHashMap', kind: 'class', family: 'general', pkg: 'java.util', since: '1.4', supertypes: ['HashMap', 'SequencedMap'], primaryParent: 'SequencedMap',
    summary: 'HashMap with a doubly linked list through its entries: insertion order or access order (for LRU caches).',
    ordering: 'Insertion or access order', nulls: 'One null key, null values', threadSafety: 'Not thread-safe', lesson: 'm07-linkedhashmap-lru' },
  { id: 'TreeMap', kind: 'class', family: 'general', pkg: 'java.util', since: '1.2', supertypes: ['NavigableMap'], superclass: 'AbstractMap', primaryParent: 'NavigableMap',
    summary: 'Red-black tree keyed by natural ordering or a Comparator. O(log n) get/put, sorted iteration, navigation and range views.',
    ordering: 'Sorted by key', nulls: 'No null key with natural ordering; null values allowed', threadSafety: 'Not thread-safe' },
  { id: 'EnumMap', kind: 'class', family: 'specialized', pkg: 'java.util', since: '1.5', supertypes: ['Map'], superclass: 'AbstractMap', primaryParent: 'Map',
    summary: 'Array indexed by enum ordinal; compact and fast. Iterates in declaration order.', nulls: 'No null keys; null values allowed' },
  { id: 'IdentityHashMap', kind: 'class', family: 'specialized', pkg: 'java.util', since: '1.4', supertypes: ['Map'], superclass: 'AbstractMap', primaryParent: 'Map',
    summary: 'Compares keys with == and System.identityHashCode; deliberately violates the general Map contract. For graph traversal, serialization, proxies.',
    nulls: 'Allowed' },
  { id: 'WeakHashMap', kind: 'class', family: 'specialized', pkg: 'java.util', since: '1.2', supertypes: ['Map'], superclass: 'AbstractMap', primaryParent: 'Map',
    summary: 'Keys held through weak references; entries disappear after their key becomes unreachable and is collected.', nulls: 'Allowed' },
  { id: 'Hashtable', kind: 'class', family: 'legacy', pkg: 'java.util', since: '1.0', supertypes: ['Map'], superclass: 'Dictionary', primaryParent: 'Map',
    summary: 'Legacy synchronized hash table. Prefer HashMap (single-threaded) or ConcurrentHashMap (shared).', nulls: 'Not allowed', threadSafety: 'Per-method synchronized' },
  { id: 'ConcurrentHashMap', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.5', supertypes: ['ConcurrentMap'], superclass: 'AbstractMap', primaryParent: 'ConcurrentMap',
    summary: 'Highly concurrent hash map; atomic per-key compute/merge; weakly consistent iterators.', nulls: 'Not allowed', threadSafety: 'Thread-safe' },
  { id: 'ConcurrentSkipListMap', kind: 'class', family: 'concurrent', pkg: 'java.util.concurrent', since: '1.6', supertypes: ['ConcurrentNavigableMap'], superclass: 'AbstractMap', primaryParent: 'ConcurrentNavigableMap',
    summary: 'Concurrent sorted map based on a skip list.', nulls: 'Not allowed', threadSafety: 'Thread-safe' },
];

export const familyLabel: Record<Family, string> = {
  core: 'Core interface',
  sequenced: 'Sequenced (Java 21+)',
  general: 'General-purpose',
  specialized: 'Specialized',
  concurrent: 'Concurrent',
  legacy: 'Legacy',
};

export const nodeById = new Map(hierarchy.map((n) => [n.id, n]));

export function childrenOf(id: string | null): HierarchyNode[] {
  return hierarchy.filter((n) => n.primaryParent === id);
}

/** All types reachable through `supertypes` that are themselves in the explorer. */
export function ancestorsOf(id: string): string[] {
  const seen = new Set<string>();
  const walk = (n: string) => {
    for (const s of nodeById.get(n)?.supertypes ?? []) {
      if (nodeById.has(s) && !seen.has(s)) {
        seen.add(s);
        walk(s);
      }
    }
  };
  walk(id);
  return [...seen];
}

export function directSubtypesOf(id: string): HierarchyNode[] {
  return hierarchy.filter((n) => n.supertypes.includes(id));
}
