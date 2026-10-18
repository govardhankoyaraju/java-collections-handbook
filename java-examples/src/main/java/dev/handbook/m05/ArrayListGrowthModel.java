package dev.handbook.m05;

import java.util.ArrayList;
import java.util.List;

/**
 * Re-implements, as plain arithmetic, the capacity policy of {@code java.util.ArrayList} in
 * OpenJDK 17–25 ({@code ArrayList.grow} + {@code jdk.internal.util.ArraysSupport.newLength}).
 *
 * <p>This is an implementation detail, not a specification guarantee. The Javadoc only promises
 * that "the details of the growth policy are not specified beyond the fact that adding an element
 * has constant amortized time cost". {@code ArrayListGrowthModelTest} checks this model against
 * the running JDK by reflection.
 */
public final class ArrayListGrowthModel {

    /** Capacity used on the first add to a list created with {@code new ArrayList<>()}. */
    public static final int DEFAULT_CAPACITY = 10;

    private ArrayListGrowthModel() {
    }

    /**
     * Capacity after growing an array of {@code oldCapacity} so that it holds at least
     * {@code minCapacity} elements.
     *
     * @param defaultConstructed {@code true} for a list from {@code new ArrayList<>()} that has
     *                           never held an element (its shared empty array is special-cased)
     */
    public static int grow(int oldCapacity, int minCapacity, boolean defaultConstructed) {
        if (oldCapacity == 0 && defaultConstructed) {
            return Math.max(DEFAULT_CAPACITY, minCapacity);
        }
        int minGrowth = minCapacity - oldCapacity;
        int preferredGrowth = oldCapacity >> 1;            // 50 %
        long preferred = (long) oldCapacity + Math.max(minGrowth, preferredGrowth);
        long softMax = Integer.MAX_VALUE - 8;              // ArraysSupport.SOFT_MAX_ARRAY_LENGTH
        if (preferred <= softMax) {
            return (int) preferred;
        }
        long required = (long) oldCapacity + minGrowth;
        if (required > Integer.MAX_VALUE) {
            throw new OutOfMemoryError("Required array length too large");
        }
        return (int) Math.max(required, softMax);
    }

    /** The capacities a list passes through while {@code n} elements are appended one at a time. */
    public static List<Integer> capacitiesForAppends(int n, int initialCapacity, boolean defaultConstructed) {
        List<Integer> capacities = new ArrayList<>();
        int capacity = initialCapacity;
        boolean pristine = defaultConstructed;
        capacities.add(capacity);
        for (int size = 0; size < n; size++) {
            if (size == capacity) {
                capacity = grow(capacity, size + 1, pristine);
                capacities.add(capacity);
            }
            pristine = false;
        }
        return capacities;
    }

    /** Total element copies performed by resizes while appending {@code n} elements. */
    public static long copiesForAppends(int n, int initialCapacity, boolean defaultConstructed) {
        long copies = 0;
        int capacity = initialCapacity;
        boolean pristine = defaultConstructed;
        for (int size = 0; size < n; size++) {
            if (size == capacity) {
                copies += size; // Arrays.copyOf copies the existing `size` references
                capacity = grow(capacity, size + 1, pristine);
            }
            pristine = false;
        }
        return copies;
    }
}
