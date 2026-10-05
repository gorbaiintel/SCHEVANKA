# Retrofit & OkHttp ProGuard Rules
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# Gson Models
-keepattributes *Annotation*
-keep class com.example.brokerbridgesync.api.models.** { *; }
-keep class com.example.brokerbridgesync.database.entities.** { *; }

# Room Database
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**
