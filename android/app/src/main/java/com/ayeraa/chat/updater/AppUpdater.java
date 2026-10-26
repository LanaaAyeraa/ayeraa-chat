package com.ayeraa.chat.updater;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.widget.Toast;

import com.ayeraa.chat.api.ApiClient;

import org.json.JSONObject;

import java.io.File;

public class AppUpdater {

    public static void check(Activity activity, boolean userInitiated) {
        if (activity == null || activity.isFinishing()) return;

        ApiClient.checkAppUpdate(new ApiClient.Callback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject obj) {
                if (activity.isFinishing()) return;

                int remoteVersion = obj.optInt("versionCode", 0);
                String remoteName = obj.optString("versionName", "1.0.0");
                String downloadUrl = obj.optString("downloadUrl", "");
                String changelog = obj.optString("changelog", "Peningkatan performa dan kestabilan.");

                long localVersion = 0;
                String localName = "1.0.0";
                try {
                    PackageInfo pInfo = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
                    localName = pInfo.versionName;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        localVersion = pInfo.getLongVersionCode();
                    } else {
                        localVersion = pInfo.versionCode;
                    }
                } catch (Exception ignored) {}

                if (remoteVersion > localVersion && !downloadUrl.isEmpty()) {
                    showUpdateDialog(activity, remoteName, changelog, downloadUrl);
                } else if (userInitiated) {
                    Toast.makeText(activity, "Aplikasi sudah dalam versi terbaru (v" + localName + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onError(String error) {
                if (userInitiated) {
                    Toast.makeText(activity, "Gagal memeriksa pembaruan: " + error, Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private static void showUpdateDialog(Activity activity, String versionName, String changelog, String downloadUrl) {
        new AlertDialog.Builder(activity)
                .setTitle("Pembaruan Tersedia (v" + versionName + ")")
                .setMessage(changelog + "\n\nPerbarui sekarang agar fitur dan koneksi selalu terbaru tanpa perlu unduh manual lewat browser.")
                .setPositiveButton("Perbarui Sekarang", (dialog, which) -> {
                    startDownload(activity, downloadUrl, versionName);
                })
                .setNegativeButton("Nanti Saja", null)
                .show();
    }

    private static void startDownload(Activity activity, String url, String versionName) {
        try {
            DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                // Fallback to browser download
                Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                activity.startActivity(browser);
                return;
            }

            String filename = "AyeraaChat-" + versionName + ".apk";
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Ayeraa Chat v" + versionName);
            request.setDescription("Mengunduh pembaruan aplikasi...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            request.setMimeType("application/vnd.android.package-archive");

            final long downloadId = dm.enqueue(request);
            Toast.makeText(activity, "Mengunduh update... Notifikasi install akan muncul saat selesai.", Toast.LENGTH_LONG).show();

            // Register receiver for completion
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            activity.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        Uri apkUri = dm.getUriForDownloadedFile(downloadId);
                        if (apkUri != null) {
                            Intent install = new Intent(Intent.ACTION_VIEW);
                            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
                            install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            try {
                                context.startActivity(install);
                            } catch (Exception e) {
                                Toast.makeText(context, "Buka file 'Downloads/" + filename + "' untuk memasang pembaruan.", Toast.LENGTH_LONG).show();
                            }
                        }
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                activity.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

        } catch (Exception e) {
            // Fallback: direct browser intent
            try {
                Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                activity.startActivity(browser);
            } catch (Exception ignored) {}
        }
    }
}
