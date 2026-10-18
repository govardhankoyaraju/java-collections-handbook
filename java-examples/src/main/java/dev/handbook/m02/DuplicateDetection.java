package dev.handbook.m02;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Two ways to find duplicate customer e-mail addresses.
 *
 * <ul>
 *   <li>{@link #duplicatesNestedLoop}: O(n²) time, O(1) extra space (besides the result).</li>
 *   <li>{@link #duplicatesWithHashSet}: O(n) expected time, O(n) extra space.</li>
 * </ul>
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m02.DuplicateDetection}
 */
public final class DuplicateDetection {

    private DuplicateDetection() {
    }

    /** Result plus the number of {@code equals} comparisons the algorithm needed. */
    public record Result(Set<String> duplicates, long comparisons) {
    }

    /** INCORRECT for large inputs: compares every pair, so the work grows quadratically. */
    public static Result duplicatesNestedLoop(List<String> emails) {
        Set<String> duplicates = new LinkedHashSet<>();
        long comparisons = 0;
        for (int i = 0; i < emails.size(); i++) {
            for (int j = i + 1; j < emails.size(); j++) {
                comparisons++;
                if (emails.get(i).equals(emails.get(j))) {
                    duplicates.add(emails.get(i));
                }
            }
        }
        return new Result(duplicates, comparisons);
    }

    /**
     * CORRECT: one pass. {@link Set#add} returns {@code false} when the element is already present,
     * so membership test and insertion are a single hash lookup. Comparisons are counted as one
     * hash probe per element (equals calls inside a bucket are not visible from outside).
     */
    public static Result duplicatesWithHashSet(List<String> emails) {
        Set<String> seen = new HashSet<>();
        Set<String> duplicates = new LinkedHashSet<>();
        long probes = 0;
        for (String email : emails) {
            probes++;
            if (!seen.add(email)) {
                duplicates.add(email);
            }
        }
        return new Result(duplicates, probes);
    }

    static List<String> sampleEmails(int n) {
        List<String> emails = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            emails.add("customer" + (i % (n - 2)) + "@example.com"); // exactly two duplicates
        }
        return emails;
    }

    public static void main(String[] args) {
        for (int n : new int[] {10, 1_000, 10_000}) {
            List<String> emails = sampleEmails(n);
            Result slow = duplicatesNestedLoop(emails);
            Result fast = duplicatesWithHashSet(emails);
            System.out.printf("n=%-6d nested-loop comparisons=%-10d hash-set probes=%-6d duplicates=%s%n",
                    n, slow.comparisons(), fast.comparisons(), fast.duplicates());
        }
    }
}
