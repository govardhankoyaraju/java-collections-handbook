import type { Assessment } from '../types.ts';

export const assessmentsM05: Assessment[] = [
  {
    id: 'a-m05-arraylist-internals',
    lessonId: 'm05-arraylist-internals',
    passRatio: 0.8,
    questions: [
      {
        id: 'q1',
        prompt: 'On OpenJDK 25, what is the capacity of `new ArrayList<>()` before and after the first add?',
        options: ['10 and 10', '0 and 10', '0 and 1', '16 and 16'],
        answerIndex: 1,
        explanation: 'The default constructor shares an empty array and allocates DEFAULT_CAPACITY (10) lazily on the first add.',
      },
      {
        id: 'q2',
        prompt: 'A list has capacity 22 and size 22. What is the capacity after one more add (OpenJDK)?',
        options: ['23', '32', '33', '44'],
        answerIndex: 2,
        explanation: '22 + max(1, 22 >> 1) = 22 + 11 = 33.',
      },
      {
        id: 'q3',
        prompt: 'What does the ArrayList Javadoc actually guarantee about growth?',
        options: [
          'Capacity grows by exactly 50%',
          'Capacity doubles',
          'Only that adding an element has constant amortized time cost',
          'Nothing at all about add',
        ],
        answerIndex: 2,
        explanation: 'The 50% policy is an OpenJDK implementation detail; the contract is amortized constant time.',
      },
      {
        id: 'q4',
        prompt: 'What is printed for list = [A, B(cancelled), C(cancelled), D] by the index loop that removes cancelled items with `remove(i)` and `i++`?',
        options: ['[A, D]', '[A, C, D]', 'ConcurrentModificationException', '[A, B, D]'],
        answerIndex: 1,
        explanation: 'After removing B, C shifts into index 1 and i++ skips it.',
      },
      {
        id: 'q5',
        prompt: 'Why does `remove(int)` set the vacated last slot to null?',
        options: [
          'To make size() correct',
          'To avoid keeping an obsolete reference that would prevent garbage collection',
          'Because arrays cannot shrink',
          'To trigger ConcurrentModificationException',
        ],
        answerIndex: 1,
        explanation: 'Leaving a stale reference would keep the object reachable — a memory leak.',
      },
      {
        id: 'q6',
        prompt: 'What does `clear()` do to the capacity?',
        options: ['Resets it to 10', 'Resets it to 0', 'Keeps it unchanged', 'Halves it'],
        answerIndex: 2,
        explanation: 'clear() nulls the slots and sets size to 0; use trimToSize() to release capacity.',
      },
    ],
  },
  {
    id: 'a-m05-arraylist-vs-linkedlist',
    lessonId: 'm05-arraylist-vs-linkedlist',
    passRatio: 0.8,
    questions: [
      {
        id: 'q1',
        prompt: 'What is the cost of `linkedList.get(i)`?',
        options: ['O(1)', 'O(log n)', 'O(min(i, n − i))', 'O(n²)'],
        answerIndex: 2,
        explanation: 'node(index) walks from the nearer end.',
      },
      {
        id: 'q2',
        prompt: 'An indexed for-loop calling get(i) over a LinkedList of n elements costs about…',
        options: ['n hops', 'n log n hops', 'n²/4 hops', 'n² hops'],
        answerIndex: 2,
        explanation: 'Each get walks up to n/2 nodes; the sum over all indexes is about n²/4 (2,499,950,000 for n = 100,000).',
      },
      {
        id: 'q3',
        prompt: 'When is LinkedList insertion genuinely O(1)?',
        options: [
          'For add(i, e) at any index',
          'At either end, or at the current position of a ListIterator',
          'Never',
          'Only when the list is empty',
        ],
        answerIndex: 1,
        explanation: 'O(1) requires already holding the node; reaching an index is O(n).',
      },
      {
        id: 'q4',
        prompt: 'What should you use for a single-threaded FIFO queue?',
        options: ['LinkedList', 'ArrayList with remove(0)', 'ArrayDeque', 'Vector'],
        answerIndex: 2,
        explanation: 'ArrayDeque offers O(1) operations at both ends with array locality and no per-element allocation.',
      },
      {
        id: 'q5',
        prompt: 'Under the HotSpot model (compressed oops), each LinkedList node costs about…',
        options: ['4 bytes', '12 bytes', '24 bytes', '64 bytes'],
        answerIndex: 2,
        explanation: '12-byte header + three 4-byte references (item, next, prev) = 24 bytes.',
      },
    ],
  },
];
