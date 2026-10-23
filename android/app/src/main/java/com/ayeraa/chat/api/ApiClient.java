package com.ayeraa.chat.api;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApiClient {
    public static final String BASE_URL = "https://haven-chat-eight.vercel.app";
    private static final ExecutorService executor = Executors.newFixedThreadPool(4);
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface Callback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    private static String request(String endpoint, String method, JSONObject jsonBody, String token) throws Exception {
        URL url = new URL(BASE_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(20000);
        conn.setRequestProperty("Accept", "application/json");

        if (token != null && !token.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + token);
        }

        if (jsonBody != null) {
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            byte[] bytes = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bytes);
            }
        }

        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        if (is == null) {
            throw new Exception("HTTP error code " + code);
        }

        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();

        if (code >= 400) {
            try {
                JSONObject errObj = new JSONObject(sb.toString());
                if (errObj.has("error")) {
                    throw new Exception(errObj.getString("error"));
                }
            } catch (Exception ignored) {}
            throw new Exception("Error " + code + ": " + sb.toString());
        }

        return sb.toString();
    }

    // 1. Login
    public static void login(String username, String password, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("username", username.trim());
                body.put("password", password);
                String res = request("/api/auth/login", "POST", body, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 2. Register
    public static void register(String name, String username, String password, String avatar, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("name", name.trim());
                body.put("username", username.trim());
                body.put("password", password);
                body.put("avatar", (avatar == null || avatar.isEmpty()) ? "⚡" : avatar);
                String res = request("/api/auth/register", "POST", body, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 3. Get Conversations (IG / WhatsApp Style DM Inbox list)
    public static void getConversations(String userId, String token, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String ep = "/api/conversations?userId=" + URLEncoder.encode(userId, "UTF-8");
                String res = request(ep, "GET", null, token);
                JSONObject obj = new JSONObject(res);
                JSONArray arr = obj.optJSONArray("conversations");
                mainHandler.post(() -> callback.onSuccess(arr != null ? arr : new JSONArray()));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 4. Get Unread Notifications
    public static void getNotifications(String userId, String token, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String ep = "/api/notifications?userId=" + URLEncoder.encode(userId, "UTF-8");
                String res = request(ep, "GET", null, token);
                JSONObject obj = new JSONObject(res);
                JSONArray arr = obj.optJSONArray("notifications");
                mainHandler.post(() -> callback.onSuccess(arr != null ? arr : new JSONArray()));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 5. Mark Notifications as Read
    public static void markNotificationsRead(String userId, String dmRoomId, String token, Callback<Boolean> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("userId", userId);
                body.put("dmRoomId", dmRoomId);
                request("/api/notifications/read", "POST", body, token);
                mainHandler.post(() -> callback.onSuccess(true));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 6. Search Users
    public static void searchUsers(String query, String token, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String ep = "/api/users/search?q=" + URLEncoder.encode(query, "UTF-8");
                String res = request(ep, "GET", null, token);
                JSONObject obj = new JSONObject(res);
                JSONArray arr = obj.optJSONArray("users");
                mainHandler.post(() -> callback.onSuccess(arr != null ? arr : new JSONArray()));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 7. Get Public Rooms
    public static void getPublicRooms(Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String res = request("/api/rooms", "GET", null, null);
                JSONObject obj = new JSONObject(res);
                JSONArray arr = obj.optJSONArray("rooms");
                mainHandler.post(() -> callback.onSuccess(arr != null ? arr : new JSONArray()));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 8. Join Room
    public static void joinRoom(String roomId, String userId, String name, String avatar, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("id", userId);
                body.put("name", name);
                body.put("avatar", avatar);
                String res = request("/api/rooms/" + URLEncoder.encode(roomId, "UTF-8") + "/join", "POST", body, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 9. Poll Room (Delta Messages & Participants)
    public static void pollRoom(String roomId, long since, String userId, String name, String avatar, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                String ep = "/api/rooms/" + URLEncoder.encode(roomId, "UTF-8") + "/poll" +
                        "?since=" + since +
                        "&userId=" + URLEncoder.encode(userId, "UTF-8") +
                        "&userName=" + URLEncoder.encode(name, "UTF-8") +
                        "&userAvatar=" + URLEncoder.encode(avatar, "UTF-8");
                String res = request(ep, "GET", null, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 10. Send Message
    public static void sendMessage(String roomId, String senderId, String senderName, String senderAvatar, String content, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("senderId", senderId);
                body.put("senderName", senderName);
                body.put("senderAvatar", senderAvatar);
                body.put("content", content);
                String res = request("/api/rooms/" + URLEncoder.encode(roomId, "UTF-8") + "/messages", "POST", body, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // 11. Toggle Reaction
    public static void toggleReaction(String roomId, String messageId, String userId, String emoji, Callback<JSONObject> callback) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("messageId", messageId);
                body.put("userId", userId);
                body.put("emoji", emoji);
                String res = request("/api/rooms/" + URLEncoder.encode(roomId, "UTF-8") + "/reactions", "POST", body, null);
                JSONObject obj = new JSONObject(res);
                mainHandler.post(() -> callback.onSuccess(obj));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }
}
