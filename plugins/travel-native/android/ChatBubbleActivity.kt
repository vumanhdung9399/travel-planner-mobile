package com.anonymous.travelplanner

class ChatBubbleActivity : MainActivity() {
  override fun invokeDefaultOnBackPressed() {
    finishAndRemoveTask()
  }
}
