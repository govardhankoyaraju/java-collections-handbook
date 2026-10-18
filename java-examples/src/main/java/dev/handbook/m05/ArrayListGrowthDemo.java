package dev.handbook.m05;

import dev.handbook.support.JdkInternals;
import java.util.ArrayList;
import java.util.List;

/**
 * Watches the real backing array of an {@link ArrayList} grow, shrink and get pre-sized.
 *
 * <p>Capacity is not observable through the public API, so this demo reads the JDK-internal
 * {@code elementData} field. That requires
 * {@code --add-opens java.base/java.util=ALL-UNNAMED} (already configured for
 * {@code ./gradlew run}). Values printed are OpenJDK implementation details.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m05.ArrayListGrowthDemo}
 */
public final class ArrayListGrowthDemo {

    private ArrayListGrowthDemo() {
    }

    public static void main(String[] args) {
        if (!JdkInternals.available()) {
            System.out.println("Capacity is not observable: run with --add-opens java.base/java.util=ALL-UNNAMED");
            return;
        }

        ArrayList<String> list = new ArrayList<>();
        System.out.println("new ArrayList<>(): size=0 capacity=" + JdkInternals.arrayListCapacity(list));

        List<Integer> observed = new ArrayList<>();
        int lastCapacity = -1;
        for (int i = 0; i < 50; i++) {
            list.add("item-" + i);
            int capacity = JdkInternals.arrayListCapacity(list);
            if (capacity != lastCapacity) {
                observed.add(capacity);
                lastCapacity = capacity;
            }
        }
        System.out.println("capacities seen while adding 50 elements: " + observed);
        System.out.println("model predicts:                          "
                + ArrayListGrowthModel.capacitiesForAppends(50, 0, true).subList(1, observed.size() + 1));

        list.trimToSize();
        System.out.println("after trimToSize(): size=" + list.size() + " capacity=" + JdkInternals.arrayListCapacity(list));

        list.ensureCapacity(51);
        System.out.println("after ensureCapacity(51): capacity=" + JdkInternals.arrayListCapacity(list)
                + " (grows by max(needed, 50%))");

        ArrayList<String> presized = new ArrayList<>(1_000);
        for (int i = 0; i < 1_000; i++) {
            presized.add("row-" + i);
        }
        System.out.println("new ArrayList<>(1000) + 1000 adds: capacity=" + JdkInternals.arrayListCapacity(presized)
                + ", resizes=0");

        ArrayList<String> zero = new ArrayList<>(0);
        List<Integer> zeroCaps = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            zero.add("x");
            zeroCaps.add(JdkInternals.arrayListCapacity(zero));
        }
        System.out.println("new ArrayList<>(0), capacity after each of 6 adds: " + zeroCaps);
        System.out.println("copies to append 1,000,000 elements from new ArrayList<>(): "
                + ArrayListGrowthModel.copiesForAppends(1_000_000, 0, true));
    }
}
