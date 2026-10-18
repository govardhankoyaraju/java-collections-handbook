package dev.handbook.m07;

import java.util.ArrayList;
import java.util.ConcurrentModificationException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * The single-lookup update methods of Map, and their null semantics, on a HashMap.
 *
 * <p>Results print through a TreeMap copy so the output order is deterministic; HashMap itself
 * makes no ordering promise.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.HashMapOperationsDemo}
 */
public final class HashMapOperationsDemo {

    private HashMapOperationsDemo() {
    }

    public record Payment(String customer, String status, long amountPaise) {
    }

    static List<Payment> payments() {
        return List.of(
                new Payment("acme", "SETTLED", 125_000),
                new Payment("globex", "FAILED", 9_900),
                new Payment("acme", "SETTLED", 50_000),
                new Payment("initech", "PENDING", 70_000),
                new Payment("globex", "SETTLED", 20_000));
    }

    /** INCORRECT: get-then-put. Two lookups, and auto-unboxing NPE when the key is absent. */
    static Map<String, Long> totalsBroken(List<Payment> payments) {
        Map<String, Long> totals = new HashMap<>();
        for (Payment p : payments) {
            totals.put(p.customer(), totals.get(p.customer()) + p.amountPaise()); // NPE on first sight
        }
        return totals;
    }

    /** CORRECT: merge does lookup + insert-or-combine in one call. */
    static Map<String, Long> totals(List<Payment> payments) {
        Map<String, Long> totals = new HashMap<>();
        for (Payment p : payments) {
            totals.merge(p.customer(), p.amountPaise(), Long::sum);
        }
        return totals;
    }

    /** computeIfAbsent builds a multi-value map without a separate containsKey check. */
    static Map<String, List<String>> customersByStatus(List<Payment> payments) {
        Map<String, List<String>> byStatus = new HashMap<>();
        for (Payment p : payments) {
            byStatus.computeIfAbsent(p.status(), status -> new ArrayList<>()).add(p.customer());
        }
        return byStatus;
    }

    public static void main(String[] args) {
        try {
            totalsBroken(payments());
        } catch (NullPointerException e) {
            System.out.println("get-then-put: NullPointerException (unboxing null)");
        }
        System.out.println("merge totals:        " + new TreeMap<>(totals(payments())));
        System.out.println("computeIfAbsent:     " + new TreeMap<>(customersByStatus(payments())));

        Map<String, Integer> retries = new HashMap<>();
        retries.put("job-1", 2);
        retries.put("job-2", 0);
        retries.computeIfPresent("job-1", (k, v) -> v - 1);              // 2 -> 1
        retries.computeIfPresent("job-2", (k, v) -> v == 0 ? null : v);   // null result removes
        retries.compute("job-3", (k, v) -> v == null ? 3 : v + 1);       // absent -> 3
        System.out.println("compute family:      " + new TreeMap<>(retries));

        Map<String, String> owners = new HashMap<>();
        owners.put("ticket-1", null);
        System.out.println("putIfAbsent on null value returns " + owners.putIfAbsent("ticket-1", "asha")
                + " and stores " + owners.get("ticket-1"));
        System.out.println("putIfAbsent on present value returns " + owners.putIfAbsent("ticket-1", "ravi")
                + " and keeps " + owners.get("ticket-1"));
        System.out.println("computeIfAbsent returning null stores nothing: "
                + owners.computeIfAbsent("ticket-2", k -> null) + ", containsKey=" + owners.containsKey("ticket-2"));
        try {
            owners.merge("ticket-3", null, (a, b) -> a + b);
        } catch (NullPointerException e) {
            System.out.println("merge with a null value -> NullPointerException");
        }

        Map<String, Integer> cache = new HashMap<>();
        try {
            cache.computeIfAbsent("a", k -> {
                cache.put("b", 2); // mapping function must not modify the map
                return 1;
            });
        } catch (ConcurrentModificationException e) {
            System.out.println("modifying the map inside computeIfAbsent -> ConcurrentModificationException");
        }
    }
}
