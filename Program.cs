using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.IO;
using Uncreated.Networking;
using Newtonsoft.Json;
using System.Globalization;
using System.Diagnostics;

namespace Uncreated.Website
{
    public class Program
    {
        public static Program I;
        public static Client NetClient;
        public static Settings Settings;
        public static CultureInfo Locale = new CultureInfo("en-US");
        public static JsonSerializerSettings Serializer = new JsonSerializerSettings() { Formatting = Formatting.Indented, Culture = Locale };
        public static readonly string DataLocation = Environment.GetEnvironmentVariable("APPDATA") + "\\Uncreated\\ASP\\";
        public static void Init()
        {
            ReadSettings();
            Logging.OnLog += LogInfo;
            Logging.OnLogWarning += LogWarn;
            Logging.OnLogError += LogError;
            Logging.OnLogException += LogException;
            Assembly assembly = Assembly.GetExecutingAssembly();
            Debug.WriteLine(assembly == null ? "null assembly" : assembly.FullName);
            try
            {
                NetFactory.RegisterNetMethods(assembly, ENetCall.FROM_SERVER);
            }
            catch (ReflectionTypeLoadException ex)
            {
                foreach (Exception inner in ex.LoaderExceptions)
                {
                    Debug.WriteLine(inner.ToString());
                }
            }
            I = new Program();
            NetClient = new Client(Settings.TCPData);
        }
        private static void ReadSettings()
        {
            string settings = DataLocation + "settings.json";
            if (!Directory.Exists(DataLocation))
                Directory.CreateDirectory(DataLocation);
            if (File.Exists(settings))
            {
                using (FileStream stream = new FileStream(settings, FileMode.OpenOrCreate, FileAccess.Read, FileShare.Read))
                {
                    byte[] utf8 = new byte[stream.Length];
                    stream.Read(utf8, 0, utf8.Length);
                    string json = System.Text.Encoding.UTF8.GetString(utf8);
                    try
                    {
                        Settings = JsonConvert.DeserializeObject<Settings>(json, Serializer);
                    }
                    catch (Exception)
                    {
                        Settings = Settings.DEFAULT;
                    }
                }
            }
            else
            {
                using (FileStream stream = new FileStream(settings, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None))
                {
                    byte[] utf8 = System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(Settings.DEFAULT, Serializer));
                    stream.Write(utf8, 0, utf8.Length);
                }
            }
        }
        public static void LogInfo(string message, ConsoleColor color)
        {
            Debug.WriteLine("[INFO]: " + message);
        }
        public static void LogWarn(string message, ConsoleColor color)
        {
            Debug.WriteLine("[WARN]: " + message);
        }
        public static void LogError(string message, ConsoleColor color)
        {
            Debug.WriteLine("[ERROR]: " + message);
        }
        public static void LogException(Exception ex, ConsoleColor color)
        {
            Debug.WriteLine("[ERROR]:\n" + ex.ToString());
        }
    }
}