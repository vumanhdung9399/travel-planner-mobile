package com.anonymous.travelplanner

import android.content.Intent
import android.os.Bundle

class ChatBubbleActivity : MainActivity() {
  override fun getMainComponentName(): String = "bubble"

  override fun onCreate(savedInstanceState: Bundle?) {
    normalizeBubbleIntent(intent)
    super.onCreate(savedInstanceState)
  }

  override fun onNewIntent(newIntent: Intent) {
    normalizeBubbleIntent(newIntent)
    super.onNewIntent(newIntent)
  }

  private fun normalizeBubbleIntent(source: Intent) {
    if (source.data != null) return
    val groupId = source.getStringExtra("groupId").orEmpty()
    if (groupId.isBlank()) return
    source.action = Intent.ACTION_VIEW
    source.data = TravelNotifications.chatBubbleDeepLink(
      groupId,
      source.getStringExtra("groupName") ?: "Trò chuyện nhóm",
      source.getStringExtra("groupAvatar").orEmpty(),
    )
  }

  override fun onUserLeaveHint() {
    // A bubble can be paused while React (or the dev launcher) is still
    // creating its delegate. ReactActivity assumes the delegate already
    // exists and otherwise crashes the whole process with an NPE.
    runCatching { super.onUserLeaveHint() }
  }

  override fun invokeDefaultOnBackPressed() {
    finishAndRemoveTask()
  }
}
