package dev.handbook.m02;

/**
 * Counts the basic steps performed by five algorithms as the input size grows.
 *
 * <p>We count <em>operations</em> (element reads and comparisons), not milliseconds. Counting is
 * deterministic and shows the growth rate that Big O describes; wall-clock time also depends on
 * the CPU, caches, the JIT compiler and garbage collection.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m02.GrowthRates}
 */
public final class GrowthRates {

    private GrowthRates() {
    }

    /** O(1): reading one array slot costs the same regardless of the array's length. */
    static long constantAccess(int[] data) {
        int middle = data[data.length / 2]; // address = base + index * 4: one step for any length
        return middle == middle ? 1 : 0;
    }

    /** O(log n): binary search halves the remaining range on every comparison. */
    static long binarySearchSteps(int[] sorted, int target) {
        long steps = 0;
        int low = 0;
        int high = sorted.length - 1;
        while (low <= high) {
            int mid = (low + high) >>> 1; // unsigned shift avoids int overflow of (low + high) / 2
            steps++;
            if (sorted[mid] < target) {
                low = mid + 1;
            } else if (sorted[mid] > target) {
                high = mid - 1;
            } else {
                return steps;
            }
        }
        return steps;
    }

    /** O(n): summing touches every element exactly once. */
    static long linearSumSteps(int[] data) {
        long steps = 0;
        long sum = 0;
        for (int value : data) {
            sum += value;
            steps++;
        }
        return sum >= 0 ? steps : steps; // sum is computed only to make the loop do real work
    }

    /** O(n log n): merge sort performs about n comparisons on each of log2(n) levels. */
    static long mergeSortComparisons(int[] data) {
        int[] copy = data.clone();
        long[] counter = new long[1];
        mergeSort(copy, new int[copy.length], 0, copy.length, counter);
        return counter[0];
    }

    private static void mergeSort(int[] a, int[] buffer, int from, int to, long[] counter) {
        if (to - from < 2) {
            return;
        }
        int mid = (from + to) >>> 1;
        mergeSort(a, buffer, from, mid, counter);
        mergeSort(a, buffer, mid, to, counter);
        int i = from;
        int j = mid;
        int k = from;
        while (i < mid && j < to) {
            counter[0]++;
            buffer[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        }
        while (i < mid) {
            buffer[k++] = a[i++];
        }
        while (j < to) {
            buffer[k++] = a[j++];
        }
        System.arraycopy(buffer, from, a, from, to - from);
    }

    /** O(n²): comparing every pair of elements. */
    static long allPairsComparisons(int[] data) {
        long steps = 0;
        for (int i = 0; i < data.length; i++) {
            for (int j = i + 1; j < data.length; j++) {
                steps++;
            }
        }
        return steps;
    }

    /** Deterministic pseudo-random input: a reversed-then-interleaved sequence, no Random needed. */
    static int[] input(int n) {
        int[] data = new int[n];
        for (int i = 0; i < n; i++) {
            data[i] = (i % 2 == 0) ? n - i : i;
        }
        return data;
    }

    static int[] sortedInput(int n) {
        int[] data = new int[n];
        for (int i = 0; i < n; i++) {
            data[i] = i * 2;
        }
        return data;
    }

    public static void main(String[] args) {
        System.out.printf("%8s %8s %10s %10s %14s %16s%n",
                "n", "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)");
        for (int n : new int[] {16, 1_024, 65_536}) {
            int[] data = input(n);
            int[] sorted = sortedInput(n);
            System.out.printf("%8d %8d %10d %10d %14d %16d%n",
                    n,
                    constantAccess(data),
                    binarySearchSteps(sorted, -1), // absent value: worst case for binary search
                    linearSumSteps(data),
                    mergeSortComparisons(data),
                    allPairsComparisons(data));
        }
    }
}
