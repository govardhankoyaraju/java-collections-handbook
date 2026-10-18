package dev.handbook.m07;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Why a HashMap key must override equals() AND hashCode() consistently.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.KeyEqualityBug}
 */
public final class KeyEqualityBug {

    private KeyEqualityBug() {
    }

    /** INCORRECT: equals() is overridden but hashCode() is inherited from Object (identity-based). */
    public static final class BrokenAccountKey {
        private final String bank;
        private final String number;

        public BrokenAccountKey(String bank, String number) {
            this.bank = bank;
            this.number = number;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof BrokenAccountKey other
                    && bank.equals(other.bank) && number.equals(other.number);
        }

        // hashCode() deliberately missing: equal objects (almost certainly) get different hash codes.
        @Override
        public int hashCode() {
            return System.identityHashCode(this); // what Object.hashCode() typically does; made explicit
        }
    }

    /** CORRECT (classic style): equals and hashCode use the same fields. */
    public static final class AccountKey {
        private final String bank;
        private final String number;

        public AccountKey(String bank, String number) {
            this.bank = Objects.requireNonNull(bank);
            this.number = Objects.requireNonNull(number);
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof AccountKey other && bank.equals(other.bank) && number.equals(other.number);
        }

        @Override
        public int hashCode() {
            return Objects.hash(bank, number);
        }
    }

    /** CORRECT (modern style): a record derives equals/hashCode from its components. */
    public record AccountId(String bank, String number) {
        public AccountId {
            Objects.requireNonNull(bank);
            Objects.requireNonNull(number);
        }
    }

    public static void main(String[] args) {
        Map<BrokenAccountKey, String> broken = new HashMap<>();
        broken.put(new BrokenAccountKey("HDFC", "001"), "Asha");
        System.out.println("equal keys:            "
                + new BrokenAccountKey("HDFC", "001").equals(new BrokenAccountKey("HDFC", "001")));
        System.out.println("broken lookup:         " + broken.get(new BrokenAccountKey("HDFC", "001")));
        broken.put(new BrokenAccountKey("HDFC", "001"), "Asha (again)");
        System.out.println("broken map size:       " + broken.size() + " (a duplicate key slipped in)");

        Map<AccountKey, String> fixed = new HashMap<>();
        fixed.put(new AccountKey("HDFC", "001"), "Asha");
        System.out.println("classic key lookup:    " + fixed.get(new AccountKey("HDFC", "001")));

        Map<AccountId, String> modern = new HashMap<>();
        modern.put(new AccountId("HDFC", "001"), "Asha");
        modern.put(new AccountId("HDFC", "001"), "Asha (again)");
        System.out.println("record key lookup:     " + modern.get(new AccountId("HDFC", "001"))
                + ", size=" + modern.size());
    }
}
