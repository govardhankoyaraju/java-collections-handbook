package dev.handbook.m02;

/**
 * A minimal growable int array that counts how many element copies resizing causes.
 *
 * <p>Two growth policies are compared:
 * <ul>
 *   <li>Grow by a constant (+1 slot): every append copies the whole array, so n appends copy
 *       about n²/2 elements. Appending is O(n) per operation.</li>
 *   <li>Grow by a factor (×1.5, the same policy {@code java.util.ArrayList} uses in OpenJDK):
 *       copies stay proportional to n, so appending is amortized O(1).</li>
 * </ul>
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m02.AmortizedGrowth}
 */
public final class AmortizedGrowth {

    /** How the capacity grows when the array is full. */
    public enum Policy { ADD_ONE, MULTIPLY_1_5 }

    private final Policy policy;
    private int[] elements;
    private int size;
    private long copies;
    private int resizes;

    public AmortizedGrowth(Policy policy, int initialCapacity) {
        if (initialCapacity < 1) {
            throw new IllegalArgumentException("initialCapacity must be >= 1");
        }
        this.policy = policy;
        this.elements = new int[initialCapacity];
    }

    public void add(int value) {
        if (size == elements.length) {
            int newCapacity = switch (policy) {
                case ADD_ONE -> elements.length + 1;
                case MULTIPLY_1_5 -> elements.length + Math.max(1, elements.length >> 1);
            };
            int[] bigger = new int[newCapacity];
            System.arraycopy(elements, 0, bigger, 0, size);
            copies += size;
            resizes++;
            elements = bigger;
        }
        elements[size++] = value;
    }

    public int size() {
        return size;
    }

    public int capacity() {
        return elements.length;
    }

    public long copies() {
        return copies;
    }

    public int resizes() {
        return resizes;
    }

    public int get(int index) {
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException("Index " + index + " out of bounds for size " + size);
        }
        return elements[index];
    }

    public static void main(String[] args) {
        System.out.printf("%-14s %9s %9s %14s %16s%n", "policy", "appends", "resizes", "copies", "copies/append");
        for (Policy policy : Policy.values()) {
            for (int n : new int[] {1_000, 100_000}) {
                AmortizedGrowth array = new AmortizedGrowth(policy, 10);
                for (int i = 0; i < n; i++) {
                    array.add(i);
                }
                System.out.printf("%-14s %9d %9d %14d %16.2f%n",
                        policy, n, array.resizes(), array.copies(), (double) array.copies() / n);
            }
        }
    }
}
