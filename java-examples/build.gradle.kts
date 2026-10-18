/*
 * Runnable examples for the Java Collections & Utilities Handbook.
 *
 * Primary reference: Java 25 (LTS). The build compiles with `--release 25` by default.
 * Most examples also compile on Java 17/21; each lesson's metadata declares the minimum
 * version and scripts/check-java-compat.sh compiles every lesson's files with
 * `javac --release <min>` to prove it.
 *
 * Override the release for experiments:  ./gradlew test -PjavaRelease=21
 * (examples that use Java 21 APIs such as SequencedCollection will not compile on 17).
 */
plugins {
    java
    application
}

group = "dev.handbook"
version = "0.1.0"

val javaRelease: Int = (findProperty("javaRelease") as String?)?.toInt() ?: 25

java {
    toolchain {
        // Uses the JDK Gradle runs on when it matches; CI installs Temurin 25.
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

val jmh: SourceSet by sourceSets.creating {
    compileClasspath += sourceSets.main.get().output
    runtimeClasspath += sourceSets.main.get().output
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    "jmhImplementation"("org.openjdk.jmh:jmh-core:1.37")
    "jmhAnnotationProcessor"("org.openjdk.jmh:jmh-generator-annprocess:1.37")
}

tasks.withType<JavaCompile>().configureEach {
    options.release = javaRelease
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all", "-Xlint:-serial", "-Werror"))
}

// JMH annotation-processor output triggers lint warnings we do not control.
tasks.named<JavaCompile>("compileJmhJava") {
    options.compilerArgs.removeAll(listOf("-Werror"))
    options.compilerArgs.add("-Xlint:-processing")
}

tasks.test {
    useJUnitPlatform()
    maxHeapSize = "512m"
    // Some tests observe JDK-internal fields (ArrayList.elementData, HashMap.table) to verify
    // the *implementation details* the lessons describe. They are labelled as such.
    jvmArgs("--add-opens", "java.base/java.util=ALL-UNNAMED")
    testLogging {
        events("failed", "skipped")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}

// `./gradlew build` also compiles (but never runs) the benchmarks.
tasks.named("check") { dependsOn("jmhClasses") }

/** Runs JMH. Results depend on your hardware/JVM; nothing in the handbook quotes numbers we did not measure. */
tasks.register<JavaExec>("jmh") {
    group = "benchmark"
    description = "Runs the JMH benchmarks (slow). Pass -PjmhArgs='...' for JMH options."
    classpath = jmh.runtimeClasspath
    mainClass = "org.openjdk.jmh.Main"
    args(((findProperty("jmhArgs") as String?) ?: "-f 1 -wi 3 -i 5").split(" "))
}

application {
    // Run any example:  ./gradlew run -PmainClass=dev.handbook.m07.HashMapPutWalkthrough
    mainClass = (findProperty("mainClass") as String?) ?: "dev.handbook.Examples"
    applicationDefaultJvmArgs = listOf("--add-opens", "java.base/java.util=ALL-UNNAMED")
}
