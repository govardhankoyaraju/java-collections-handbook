package dev.handbook;

/**
 * Lists the runnable examples. Run one with
 * {@code ./gradlew run -PmainClass=<fully.qualified.ClassName>}.
 */
public final class Examples {

    private Examples() {
    }

    static final String[] EXAMPLES = {
        "dev.handbook.m02.GrowthRates",
        "dev.handbook.m02.DuplicateDetection",
        "dev.handbook.m02.AmortizedGrowth",
        "dev.handbook.m02.MemoryFootprintModel",
        "dev.handbook.m02.LookupIndexing",
        "dev.handbook.m03.HierarchyTour",
        "dev.handbook.m03.ContractProbe",
        "dev.handbook.m03.SequencedTour",
        "dev.handbook.m03.MapViewsTour",
        "dev.handbook.m05.ArrayListGrowthDemo",
        "dev.handbook.m05.ListRemovalPitfalls",
        "dev.handbook.m05.LinkedListTraversalModel",
        "dev.handbook.m07.HashMapIndexing",
        "dev.handbook.m07.KeyEqualityBug",
        "dev.handbook.m07.HashMapResizeDemo",
        "dev.handbook.m07.TreeificationDemo",
        "dev.handbook.m07.HashMapOperationsDemo",
        "dev.handbook.m07.MutableKeyDemo",
        "dev.handbook.m07.ConcurrentCountingDemo",
        "dev.handbook.m07.HashMapMemoryModel",
        "dev.handbook.m07.LruCacheDemo",
    };

    public static void main(String[] args) {
        System.out.println("Runnable examples (./gradlew run -PmainClass=<class>):");
        for (String example : EXAMPLES) {
            System.out.println("  " + example);
        }
    }
}
