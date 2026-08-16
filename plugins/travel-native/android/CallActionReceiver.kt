package com.anonymous.travelplanner

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CallActionReceiver : BroadcastReceiver() {
  companion object {
    const val ACCEPT = "com.anonymous.travelplanner.ACCEPT_CALL"
    const val DECLINE = "com.anonymous.travelplanner.DECLINE_CALL"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val groupId = intent.getStringExtra("groupId").orEmpty()
    TravelNotifications.cancelIncomingCall(context, groupId)
    if (intent.action != ACCEPT) return
    val media = intent.getStringExtra("media") ?: "audio"
    context.startActivity(Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = TravelNotifications.callDeepLink(groupId, media)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    })
  }
}
