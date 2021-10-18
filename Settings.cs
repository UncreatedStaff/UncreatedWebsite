using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Uncreated.Networking.Encoding;
using Uncreated.SQL;
using Newtonsoft.Json;

namespace UCWebsite
{
    public class Settings
    {
        [JsonIgnore]
        public const uint DATA_VERSION = 1;
        public static readonly Settings DEFAULT = new Settings()
        {
            SQLData = new MySqlData
            {
                CharSet = "utf8mb4",
                Database = "unturned",
                Host = "127.0.0.1",
                Password = "password",
                Username = "username",
                Port = 3306
            },
            TCPData = new Uncreated.Networking.Client.ConnectionInfo("127.0.0.1", 31902, "ucweb")
        };
        public MySqlData SQLData;
        public Uncreated.Networking.Client.ConnectionInfo TCPData;
    }
}