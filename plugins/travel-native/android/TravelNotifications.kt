package com.anonymous.travelplanner

import android.app.Notification
import android.app.NotificationChannel
import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person as CompatPerson
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import java.net.URL

object TravelNotifications {
  const val CALL_ENDED_ACTION = "com.anonymous.travelplanner.CALL_ENDED"
  // Channel sound settings are immutable once Android creates a channel.
  // Bump these IDs to restore the bundled call/message sounds for users
  // whose previous channels were configured as silent.
  private const val CALL_CHANNEL = "travel_calls_v5"
  private const val CHAT_CHANNEL = "travel_messages_v5"
  private const val CALL_NOTIFICATION_BASE = 41000
  private const val CHAT_NOTIFICATION_BASE = 51000
  private val activeCallIds = java.util.concurrent.ConcurrentHashMap<String, String>()
  private val dismissedCallIds = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()
  private val locallyDismissedUntil = java.util.concurrent.ConcurrentHashMap<String, Long>()

  private fun notificationId(base: Int, groupId: String) =
    base + (groupId.hashCode() and 0x0fff)

  fun callDeepLink(groupId: String, media: String): Uri =
    Uri.Builder()
      .scheme("travelplannermobile")
      .authority("groups")
      .appendPath(groupId)
      .appendPath("chat")
      .appendQueryParameter("call", media)
      .build()

  fun chatDeepLink(groupId: String): Uri =
    Uri.Builder()
      .scheme("travelplannermobile")
      .authority("groups")
      .appendPath(groupId)
      .appendPath("chat")
      .appendQueryParameter("source", "notification")
      .build()

  fun chatBubbleDeepLink(
    groupId: String,
    groupName: String,
    groupAvatar: String,
  ): Uri =
    Uri.Builder()
      .scheme("travelplannermobile")
      .authority("bubble")
      .appendPath(groupId)
      .appendQueryParameter("name", groupName)
      .appendQueryParameter("avatar", groupAvatar)
      .build()

  private fun remoteIcon(url: String): IconCompat? {
    if (url.isBlank()) return null
    return runCatching {
      val connection = URL(url).openConnection().apply {
        connectTimeout = 2_500
        readTimeout = 2_500
        useCaches = true
      }
      connection.getInputStream().use { stream ->
        BitmapFactory.decodeStream(stream)?.let(IconCompat::createWithAdaptiveBitmap)
      }
    }.getOrNull()
  }

  fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val callSound = Uri.parse(
      "android.resource://${context.packageName}/${R.raw.call}",
    )
    val messageSound = Uri.parse(
      "android.resource://${context.packageName}/${R.raw.messenger}",
    )
    val callAudio = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .build()
    val callChannel = NotificationChannel(
      CALL_CHANNEL,
      "Cuộc gọi đến",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Thông báo toàn màn hình khi có cuộc gọi nhóm"
      enableVibration(true)
      setVibrationPattern(longArrayOf(0, 650, 350, 650))
      setSound(callSound, callAudio)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
    }
    val messageAudio = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build()
    val chatChannel = NotificationChannel(
      CHAT_CHANNEL,
      "Bong bóng trò chuyện",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Tin nhắn nhóm có thể hiển thị dưới dạng bong bóng"
      enableVibration(true)
      setVibrationPattern(longArrayOf(0, 90, 55, 140))
      setSound(messageSound, messageAudio)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setAllowBubbles(true)
    }
    manager.createNotificationChannels(listOf(callChannel, chatChannel))
  }

  fun showIncomingCall(
    context: Context,
    data: Map<String, String>,
    requestFullScreen: Boolean = true,
  ) {
    val groupId = data["groupId"].orEmpty()
    if (groupId.isBlank()) return
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
    val now = System.currentTimeMillis()
    val expiresAt = data["expiresAt"]?.toLongOrNull()
    if (expiresAt != null && now > expiresAt) return
    val callId = data["callId"]
    if (callId != null && dismissedCallIds.contains(callId)) return
    val elapsed = android.os.SystemClock.elapsedRealtime()
    val suppressedUntil = locallyDismissedUntil[groupId]
    if (suppressedUntil != null && elapsed <= suppressedUntil) return
    if (suppressedUntil != null) locallyDismissedUntil.remove(groupId, suppressedUntil)
    if (callId != null) activeCallIds[groupId] = callId
    createChannels(context)
    val media = data["media"] ?: "audio"
    val caller = data["name"] ?: data["title"] ?: "Thành viên nhóm"
    val groupName = data["groupName"] ?: "Nhóm"
    val requestCode = notificationId(CALL_NOTIFICATION_BASE, groupId)
    val fullScreenIntent = Intent(context, IncomingCallActivity::class.java).apply {
      putExtra("groupId", groupId)
      putExtra("media", media)
      putExtra("caller", caller)
      putExtra("groupName", groupName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      requestCode,
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val acceptIntent = Intent(context, IncomingCallActivity::class.java).apply {
      action = CallActionReceiver.ACCEPT
      putExtra("groupId", groupId)
      putExtra("media", media)
      putExtra("caller", caller)
      putExtra("groupName", groupName)
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP,
      )
    }
    val declineIntent = Intent(context, CallActionReceiver::class.java).apply {
      action = CallActionReceiver.DECLINE
      putExtra("groupId", groupId)
    }
    val acceptPendingIntent = PendingIntent.getActivity(
      context,
      requestCode + 1,
      acceptIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val declinePendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode + 2,
      declineIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val callerPerson = CompatPerson.Builder()
      .setName(caller)
      .setImportant(true)
      .build()
    val callStyle = NotificationCompat.CallStyle.forIncomingCall(
      callerPerson,
      declinePendingIntent,
      acceptPendingIntent,
    ).setIsVideo(media == "video")
    val callSound = Uri.parse(
      "android.resource://${context.packageName}/${R.raw.call}",
    )
    val builder = NotificationCompat.Builder(context, CALL_CHANNEL)
      .setSmallIcon(R.drawable.notification_icon)
      .setColor(Color.rgb(22, 135, 248))
      .setContentTitle(caller)
      .setContentText("Cuộc gọi ${if (media == "video") "video" else "thoại"} từ $groupName")
      .setStyle(callStyle)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(45_000)
      .setSound(callSound)
      .setVibrate(longArrayOf(0, 650, 350, 650))
      .setContentIntent(fullScreenPendingIntent)
    val canUseFullScreenIntent =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
        context.getSystemService(NotificationManager::class.java)
          .canUseFullScreenIntent()
    if (requestFullScreen && canUseFullScreenIntent) {
      builder.setFullScreenIntent(fullScreenPendingIntent, true)
    }
    val notification = builder.build().apply {
      flags = flags or Notification.FLAG_INSISTENT
    }
    NotificationManagerCompat.from(context).notify(requestCode, notification)

    // Android intentionally keeps a full-screen intent as a heads-up banner
    // while an unlocked device is in use. A high-priority FCM call grants a
    // short background-start window, so use it to present the real call UI.
    // The notification remains the fallback for OEMs that block the start.
    val powerManager = context.getSystemService(PowerManager::class.java)
    val keyguardManager = context.getSystemService(KeyguardManager::class.java)
    val isUnlockedAndInteractive =
      powerManager?.isInteractive == true && keyguardManager?.isKeyguardLocked == false
    if (
      requestFullScreen &&
      canUseFullScreenIntent &&
      isUnlockedAndInteractive
    ) {
      runCatching { context.startActivity(fullScreenIntent) }
    }
  }

  fun cancelIncomingCall(
    context: Context,
    groupId: String,
    callId: String? = null,
  ) {
    if (groupId.isBlank()) return
    if (callId != null) {
      dismissedCallIds.add(callId)
      val activeCallId = activeCallIds[groupId]
      if (activeCallId != null && activeCallId != callId) return
    } else {
      locallyDismissedUntil[groupId] = android.os.SystemClock.elapsedRealtime() + 8_000
      activeCallIds[groupId]?.let(dismissedCallIds::add)
    }
    activeCallIds.remove(groupId)
    NotificationManagerCompat.from(context).cancel(
      notificationId(CALL_NOTIFICATION_BASE, groupId),
    )
    context.sendBroadcast(Intent(CALL_ENDED_ACTION).apply {
      setPackage(context.packageName)
      putExtra("groupId", groupId)
    })
  }

  fun showChatBubble(context: Context, data: Map<String, String>) {
    val groupId = data["groupId"].orEmpty()
    if (groupId.isBlank()) return
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
    createChannels(context)
    val groupName = data["groupName"] ?: "Trò chuyện nhóm"
    val groupAvatar = data["groupAvatar"] ?: data["senderAvatar"].orEmpty()
    val senderName = data["senderName"] ?: data["title"] ?: "Thành viên"
    val body = data["body"].orEmpty()
    val requestCode = notificationId(CHAT_NOTIFICATION_BASE, groupId)
    val shortcutId = "group_chat_$groupId"
    val icon = remoteIcon(groupAvatar)
      ?: IconCompat.createWithResource(context, R.mipmap.ic_launcher)
    val sender = CompatPerson.Builder()
      .setName(senderName)
      .setIcon(icon)
      .build()
    val user = CompatPerson.Builder().setName("Bạn").build()
    val shortcut = ShortcutInfoCompat.Builder(context, shortcutId)
      .setShortLabel(groupName.take(30))
      .setLongLived(true)
      .setIcon(icon)
      .setPerson(sender)
      .setIntent(Intent(Intent.ACTION_VIEW, chatDeepLink(groupId)))
      .build()
    ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)

    val bubbleIntent = Intent(context, ChatBubbleActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      setData(chatBubbleDeepLink(groupId, groupName, groupAvatar))
      putExtra("groupId", groupId)
      putExtra("groupName", groupName)
      putExtra("groupAvatar", groupAvatar)
      addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK)
    }
    val contentIntent = Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      setData(chatDeepLink(groupId))
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val bubblePendingIntent = PendingIntent.getActivity(
      context,
      requestCode,
      bubbleIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    val contentPendingIntent = PendingIntent.getActivity(
      context,
      requestCode + 1,
      contentIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val style = NotificationCompat.MessagingStyle(user)
      .setConversationTitle(groupName)
      .setGroupConversation(true)
      .addMessage(body, System.currentTimeMillis(), sender)
    val messageSound = Uri.parse(
      "android.resource://${context.packageName}/${R.raw.messenger}",
    )
    val builder = NotificationCompat.Builder(context, CHAT_CHANNEL)
      .setSmallIcon(R.drawable.notification_icon)
      .setColor(Color.rgb(22, 135, 248))
      .setContentTitle(senderName)
      .setContentText(body)
      .setStyle(style)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setShortcutId(shortcutId)
      .setLocusId(androidx.core.content.LocusIdCompat(shortcutId))
      .addPerson(sender)
      .setContentIntent(contentPendingIntent)
      .setSound(messageSound)
      .setVibrate(longArrayOf(0, 90, 55, 140))
      .setOnlyAlertOnce(false)
      .setAutoCancel(false)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val bubble = NotificationCompat.BubbleMetadata.Builder(bubblePendingIntent, icon)
        .setDesiredHeight(640)
        .setAutoExpandBubble(true)
        .setSuppressNotification(false)
        .build()
      builder.setBubbleMetadata(bubble)
    }
    NotificationManagerCompat.from(context).notify(requestCode, builder.build())
  }
}
