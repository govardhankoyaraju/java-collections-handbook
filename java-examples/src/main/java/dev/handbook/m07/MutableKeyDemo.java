package dev.handbook.m07;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * What happens when a key's hashCode changes after it was inserted into a HashMap.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.MutableKeyDemo}
 */
public final class MutableKeyDemo {

    private MutableKeyDemo() {
    }

    /** INCORRECT as a key: equals/hashCode depend on a field that can change. */
    public static final class MutableSku {
        private String code;

        public MutableSku(String code) {
            this.code = code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof MutableSku other && Objects.equals(code, other.code);
        }

        @Override
        public int hashCode() {
            return Objects.hashCode(code);
        }

        @Override
        public String toString() {
            return code;
        }
    }

    /** CORRECT: an immutable record key; "renaming" means remove + put with a new key. */
    public record Sku(String code) {
        public Sku {
            Objects.requireNonNull(code);
        }
    }

    public static void main(String[] args) {
        Map<MutableSku, Integer> stock = new HashMap<>();
        MutableSku key = new MutableSku("SKU-1");
        stock.put(key, 10);

        key.setCode("SKU-1-RENAMED"); // hashCode changes; the node stays in the OLD bucket

        System.out.println("get(same instance):          " + stock.get(key));
        System.out.println("get(new \"SKU-1\"):            " + stock.get(new MutableSku("SKU-1")));
        System.out.println("containsKey(same instance):  " + stock.containsKey(key));
        System.out.println("size:                        " + stock.size());
        System.out.println("entry still iterates:        " + stock);
        System.out.println("remove(same instance):       " + stock.remove(key) + " (cannot be found to remove)");

        Set<MutableSku> seen = new HashSet<>();
        MutableSku a = new MutableSku("A");
        seen.add(a);
        a.setCode("B");
        seen.add(a); // the same object is now stored twice
        System.out.println("HashSet with one object added twice: size=" + seen.size());

        Map<Sku, Integer> safe = new HashMap<>();
        safe.put(new Sku("SKU-1"), 10);
        Integer moved = safe.remove(new Sku("SKU-1"));
        safe.put(new Sku("SKU-1-RENAMED"), moved);
        System.out.println("immutable key, remove + put: " + safe);
    }
}
