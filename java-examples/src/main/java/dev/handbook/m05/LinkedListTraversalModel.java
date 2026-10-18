package dev.handbook.m05;

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

/**
 * Counts node hops for LinkedList index access, using the same rule as OpenJDK's
 * {@code LinkedList.node(int)}: walk from {@code first} when {@code index < size / 2},
 * otherwise walk backwards from {@code last}.
 *
 * <p>The hop counts are a model of the algorithm (verified against JDK 25 source), not a timing.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m05.LinkedListTraversalModel}
 */
public final class LinkedListTraversalModel {

    private LinkedListTraversalModel() {
    }

    /** Hops needed by {@code LinkedList.get(index)} on a list of {@code size} nodes. */
    public static long hopsForGet(int index, int size) {
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException("Index: " + index + ", Size: " + size);
        }
        return index < (size >> 1) ? index : (long) size - 1 - index;
    }

    /** Total hops for {@code for (int i = 0; i < size; i++) list.get(i)}: about n²/4. */
    public static long hopsForIndexedLoop(int size) {
        long total = 0;
        for (int i = 0; i < size; i++) {
            total += hopsForGet(i, size);
        }
        return total;
    }

    /** INCORRECT for LinkedList: each get(i) walks the chain again. */
    static long sumByIndex(List<Integer> values) {
        long sum = 0;
        for (int i = 0; i < values.size(); i++) {
            sum += values.get(i);
        }
        return sum;
    }

    /** CORRECT for every List: the iterator keeps its position, one hop per element. */
    static long sumByIterator(List<Integer> values) {
        long sum = 0;
        for (Iterator<Integer> it = values.iterator(); it.hasNext(); ) {
            sum += it.next();
        }
        return sum;
    }

    public static void main(String[] args) {
        System.out.printf("%10s %22s %20s%n", "size", "indexed-loop hops", "iterator hops");
        for (int n : new int[] {10, 1_000, 100_000}) {
            System.out.printf("%10d %22d %20d%n", n, hopsForIndexedLoop(n), (long) Math.max(0, n - 1));
        }
        List<Integer> list = new LinkedList<>(List.of(1, 2, 3, 4, 5));
        System.out.println("same results: " + (sumByIndex(list) == sumByIterator(list)));
    }
}
