package expo.modules.powersettings

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import androidx.core.content.PackageManagerCompat
import androidx.core.content.UnusedAppRestrictionsConstants
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PowerSettingsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PowerSettings")

    AsyncFunction<Boolean>("isIgnoringBatteryOptimizations") {
      val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    AsyncFunction<Boolean>("requestIgnoreBatteryOptimizations") {
      startFromActivity(
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")),
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction<Boolean>("openSamsungNeverSleeping") {
      startFromActivity(
        Intent(SAMSUNG_LIST_ACTION)
          .setPackage(SAMSUNG_DEVICE_CARE_PACKAGE)
          .putExtra(SAMSUNG_ACTIVITY_TYPE, SAMSUNG_NEVER_SLEEPING),
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("unusedAppRestrictionsStatus") { promise: Promise ->
      val future = PackageManagerCompat.getUnusedAppRestrictionsStatus(context)
      future.addListener(
        {
          val status = try {
            future.get()
          } catch (error: Exception) {
            UnusedAppRestrictionsConstants.ERROR
          }
          promise.resolve(statusName(status))
        },
        ContextCompat.getMainExecutor(context),
      )
    }

    AsyncFunction<Boolean>("openUnusedAppRestrictions") {
      val activity = appContext.currentActivity
      if (activity == null) {
        false
      } else {
        try {
          startForResult(activity, IntentCompat.createManageUnusedAppRestrictionsIntent(activity, activity.packageName))
          true
        } catch (error: RuntimeException) {
          false
        }
      }
    }.runOnQueue(Queues.MAIN)
  }

  private fun startFromActivity(intent: Intent): Boolean {
    val activity = appContext.currentActivity ?: return false
    return try {
      activity.startActivity(intent)
      true
    } catch (error: RuntimeException) {
      false
    }
  }

  @Suppress("DEPRECATION")
  private fun startForResult(activity: Activity, intent: Intent) {
    activity.startActivityForResult(intent, UNUSED_APP_RESTRICTIONS_REQUEST)
  }

  private fun statusName(status: Int): String = when (status) {
    UnusedAppRestrictionsConstants.DISABLED -> "disabled"
    UnusedAppRestrictionsConstants.FEATURE_NOT_AVAILABLE -> "unavailable"
    UnusedAppRestrictionsConstants.API_30_BACKPORT,
    UnusedAppRestrictionsConstants.API_30,
    UnusedAppRestrictionsConstants.API_31 -> "enabled"
    else -> "error"
  }

  private companion object {
    const val SAMSUNG_LIST_ACTION = "com.samsung.android.sm.ACTION_OPEN_CHECKABLE_LISTACTIVITY"
    const val SAMSUNG_DEVICE_CARE_PACKAGE = "com.samsung.android.lool"
    const val SAMSUNG_ACTIVITY_TYPE = "activity_type"
    const val SAMSUNG_NEVER_SLEEPING = 2
    const val UNUSED_APP_RESTRICTIONS_REQUEST = 7301
  }
}
