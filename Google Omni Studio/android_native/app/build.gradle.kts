plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.omnistudio.labs"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.omnistudio.labs"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "2.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    // AndroidX Core & Material 3 Dark Theme
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.coordinatorlayout:coordinatorlayout:1.2.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Android WebKit (쿠키 영구 보존 및 Headless WebView 제어)
    implementation("androidx.webkit:webkit:1.11.0")

    // Coil 이미지 비동기 로딩 및 Base64 캐싱
    implementation("io.coil-kt:coil:2.6.0")

    // Kotlin 코루틴 비동기 작업 처리
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")

    // Media3 ExoPlayer (Flow 비디오 및 Flow Music 사운드트랙 고성능 스트리밍/로컬 재생)
    implementation("androidx.media3:media3-exoplayer:1.3.1")
    implementation("androidx.media3:media3-ui:1.3.1")
}

/*
 * ============================================================================
 * [동작 확인 방법 - build.gradle.kts]
 * 1. 의존성 다운로드 및 Gradle 동기화:
 *    - ./gradlew build --refresh-dependencies
 * 2. APK 컴파일 및 디버그 빌드:
 *    - ./gradlew assembleDebug
 *    - app/build/outputs/apk/debug/app-debug.apk 파일 생성 확인.
 * 3. 기기 설치 및 실행:
 *    - adb install -r app/build/outputs/apk/debug/app-debug.apk
 *    - adb shell am start -n com.omnistudio.labs/.MainActivity
 * ============================================================================
 */
