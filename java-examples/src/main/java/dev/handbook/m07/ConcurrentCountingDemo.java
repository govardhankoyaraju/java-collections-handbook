package dev.handbook.m07;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Counting events from several threads. HashMap is not thread-safe; ConcurrentHashMap.merge is
 * atomic per key.
 *
 * <p><strong>Nondeterministic output:</strong> the unsafe HashMap total varies from run to run
 * and may occasionally be correct by luck. A data race is a bug even when a particular run
 * happens to print the right number. Only the ConcurrentHashMap line is guaranteed.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.ConcurrentCountingDemo}
 */
public final class ConcurrentCountingDemo {

    private ConcurrentCountingDemo() {
    }

    static final int THREADS = 4;
    static final int EVENTS_PER_THREAD = 50_000;

    static long count(Map<String, Integer> counts) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        try {
            for (int t = 0; t < THREADS; t++) {
                pool.execute(() -> {
                    for (int i = 0; i < EVENTS_PER_THREAD; i++) {
                        counts.merge("event-" + (i % 100), 1, Integer::sum);
                    }
                });
            }
        } finally {
            pool.shutdown();
        }
        if (!pool.awaitTermination(1, TimeUnit.MINUTES)) {
            throw new IllegalStateException("timed out");
        }
        return counts.values().stream().mapToLong(Integer::longValue).sum();
    }

    public static void main(String[] args) throws InterruptedException {
        long expected = (long) THREADS * EVENTS_PER_THREAD;
        long concurrent = count(new ConcurrentHashMap<>());
        System.out.println("expected total:            " + expected);
        System.out.println("ConcurrentHashMap total:   " + concurrent);
        try {
            long unsafe = count(new HashMap<>());
            System.out.println("HashMap total (racy):      " + unsafe + (unsafe == expected ? " (correct by luck)" : " (updates lost)"));
        } catch (RuntimeException e) {
            System.out.println("HashMap failed outright:   " + e);
        }
    }
}
