package com.anonymous.travelplanner

import android.app.ActivityManager
import android.content.Context
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
    when (data["type"]) {
      "incoming_call" -> {
        val foreground = appIsForeground()
        TravelNotifications.showIncomingCall(
          this,
          data,
          requestFullScreen = !foreground,
        )
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
  }
}
