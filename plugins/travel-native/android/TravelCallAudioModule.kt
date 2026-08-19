package com.anonymous.travelplanner

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TravelCallAudioModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private var ringtonePlayer: MediaPlayer? = null
    private var messagePlayer: MediaPlayer? = null
    private var ringtoneAudioManager: AudioManager? = null
    private var ringtoneFocusRequest: AudioFocusRequest? = null
    private val ringtoneFocusListener = AudioManager.OnAudioFocusChangeListener { change ->
      if (
        change == AudioManager.AUDIOFOCUS_LOSS ||
        change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
      ) {
        stopRingtoneInternal()
      }
    }

    @Synchronized
    private fun stopRingtoneInternal() {
      ringtonePlayer?.let { player ->
        try {
          if (player.isPlaying) player.stop()
        } catch (_: IllegalStateException) {
          // The player may already have been released by the Android audio stack.
        }
        player.release()
      }
      ringtonePlayer = null

      ringtoneAudioManager?.let { audioManager ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ringtoneFocusRequest?.let(audioManager::abandonAudioFocusRequest)
        } else {
          @Suppress("DEPRECATION")
          audioManager.abandonAudioFocus(ringtoneFocusListener)
        }
      }
      ringtoneFocusRequest = null
      ringtoneAudioManager = null
    }
  }

  override fun getName() = "TravelCallAudio"

  @ReactMethod
  fun playMessageAlert(promise: Promise) {
    try {
      synchronized(TravelCallAudioModule::class.java) {
        messagePlayer?.release()
        val attributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        messagePlayer = MediaPlayer.create(
          reactApplicationContext,
          R.raw.messenger,
          attributes,
          0,
        )?.apply {
          setOnCompletionListener { completed ->
            completed.release()
            if (messagePlayer === completed) messagePlayer = null
          }
          start()
        }
        promise.resolve(messagePlayer != null)
      }
    } catch (error: Exception) {
      messagePlayer?.release()
      messagePlayer = null
      promise.reject("MESSAGE_ALERT_PLAY_ERROR", error)
    }
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        promise.resolve(true)
        return
      }
      val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
      promise.resolve(manager.canUseFullScreenIntent())
    } catch (error: Exception) {
      promise.reject("FULL_SCREEN_PERMISSION_CHECK_ERROR", error)
    }
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        promise.resolve(true)
        return
      }
      val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
      if (manager.canUseFullScreenIntent()) {
        promise.resolve(true)
        return
      }
      reactApplicationContext.startActivity(
        Intent(
          Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
          Uri.parse("package:${reactApplicationContext.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
      promise.resolve(false)
    } catch (error: Exception) {
      promise.reject("FULL_SCREEN_PERMISSION_SETTINGS_ERROR", error)
    }
  }

  @ReactMethod
  fun canDisplayOverOtherApps(promise: Promise) {
    try {
      promise.resolve(
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
          Settings.canDrawOverlays(reactApplicationContext),
      )
    } catch (error: Exception) {
      promise.reject("OVERLAY_PERMISSION_CHECK_ERROR", error)
    }
  }

  @ReactMethod
  fun openOtherPermissionsSettings(promise: Promise) {
    try {
      val packageName = reactApplicationContext.packageName
      val miuiIntent = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
        putExtra("extra_pkgname", packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      val appDetailsIntent = Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:$packageName"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

      // MIUI exposes its extra controls on this screen. The intent is not part
      // of the Android SDK, so devices without it safely fall back to App info.
      if (miuiIntent.resolveActivity(reactApplicationContext.packageManager) != null) {
        reactApplicationContext.startActivity(miuiIntent)
      } else {
        reactApplicationContext.startActivity(appDetailsIntent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OTHER_PERMISSIONS_SETTINGS_ERROR", error)
    }
  }

  @ReactMethod
  fun startIncomingRingtone(promise: Promise) {
    try {
      synchronized(TravelCallAudioModule::class.java) {
        if (ringtonePlayer?.isPlaying == true) {
          promise.resolve(true)
          return
        }
        stopRingtoneInternal()

        val audioManager =
          reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val attributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        val focusGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener(ringtoneFocusListener)
            .build()
          ringtoneFocusRequest = request
          audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
          @Suppress("DEPRECATION")
          audioManager.requestAudioFocus(
            ringtoneFocusListener,
            AudioManager.STREAM_RING,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT,
          ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
        if (!focusGranted) {
          ringtoneFocusRequest = null
          promise.resolve(false)
          return
        }

        ringtoneAudioManager = audioManager
        ringtonePlayer = MediaPlayer.create(
          reactApplicationContext,
          R.raw.call,
          attributes,
          0,
        )?.apply {
          isLooping = true
          start()
        }
        promise.resolve(ringtonePlayer != null)
      }
    } catch (error: Exception) {
      stopRingtoneInternal()
      promise.reject("INCOMING_RINGTONE_START_ERROR", error)
    }
  }

  @ReactMethod
  fun stopIncomingRingtone(promise: Promise) {
    try {
      stopRingtoneInternal()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("INCOMING_RINGTONE_STOP_ERROR", error)
    }
  }

  @ReactMethod
  fun dismissIncomingCallNotification(groupId: String, promise: Promise) {
    try {
      TravelNotifications.cancelIncomingCall(reactApplicationContext, groupId)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("INCOMING_CALL_DISMISS_ERROR", error)
    }
  }

  @Suppress("DEPRECATION")
  @ReactMethod
  fun setSpeakerEnabled(enabled: Boolean, promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (enabled) {
          audioManager.availableCommunicationDevices
            .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            ?.let(audioManager::setCommunicationDevice)
        } else {
          val earpiece = audioManager.availableCommunicationDevices
            .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
          if (earpiece != null) audioManager.setCommunicationDevice(earpiece)
          else audioManager.clearCommunicationDevice()
        }
      } else {
        audioManager.isSpeakerphoneOn = enabled
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("AUDIO_ROUTE_ERROR", error)
    }
  }

  @Suppress("DEPRECATION")
  @ReactMethod
  fun resetAudioRoute(promise: Promise) {
    try {
      val audioManager =
        reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        audioManager.clearCommunicationDevice()
      } else {
        audioManager.isSpeakerphoneOn = false
      }
      audioManager.mode = AudioManager.MODE_NORMAL
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("AUDIO_ROUTE_RESET_ERROR", error)
    }
  }

  @ReactMethod
  fun openBubbleSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Intent(Settings.ACTION_APP_NOTIFICATION_BUBBLE_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
        }
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("BUBBLE_SETTINGS_ERROR", error)
    }
  }
}
