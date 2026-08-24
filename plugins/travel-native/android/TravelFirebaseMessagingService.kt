package com.anonymous.travelplanner

import android.app.ActivityManager
import android.content.Context
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

class TravelFirebaseMessagingService : ExpoFirebaseMessagingService() {
  private fun appIsForeground(): Boolean {
    val manager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return manager.runningAppProcesses?.any {
      it.processName == packageName &&
        it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    } == true
  }

  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    try {
      when (data["type"]) {
        "incoming_call" -> {
          val foreground = appIsForeground()
          // Foreground calls are rendered and rung by IncomingCallListener.
          // Avoid a duplicate native notification/ringtone in that state.
          if (!foreground) {
            TravelNotifications.showIncomingCall(
              this,
              data,
              requestFullScreen = true,
            )
          }
        }
        "call_ended" -> TravelNotifications.cancelIncomingCall(
          this,
          data["groupId"].orEmpty(),
          data["callId"],
        )
        "chat_message" -> {
          if (!appIsForeground()) TravelNotifications.showChatBubble(this, data)
        }
        else -> super.onMessageReceived(message)
      }
    } catch (error: Exception) {
      // A malformed payload or OEM-specific notification failure must not
      // terminate the application process.
      Log.e("TravelMessaging", "Native notification handling failed", error)
      if (data["type"] != "call_ended") {
        super.onMessageReceived(message)
      }
    }
  }
}
