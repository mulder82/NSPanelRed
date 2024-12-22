# Sonoff NSPanel Tasmota driver v0.47 | code by blakadder and s-hadinger
class NSPanel : Driver
  
  static types = {
    '"relation":':   0x86,
    '"switches":[{':     0x87,
    "ATC":      0x84,
    "index":    0x86,
    "params":     0x86,
    "wifiState":  0x85,
    "HMI_resources":0x86,
    "temp":     0x83,
    "year":     0x82,
    "weather":    0x81,
    "queryInfo":  0x80,
    "HMI_dimOpen":  0x87,
    "HMI_wallpaper":0x87,
  }
  static header = bytes('55AA') 

  var ser  # create serial port object
       
  # intialize the serial port, if unspecified Tx/Rx are GPIO 16/17
  def init(tx, rx)
    if !tx   tx = 16 end
    if !rx   rx = 17 end
    self.ser = serial(rx, tx, 115200, serial.SERIAL_8N1)
    tasmota.add_driver(self)
  end

  # determine type of message
  def findtype(value)
    import string
    for k:self.types.keys()
      if string.find(value, k) >= 0
        return self.types[k]
      end
    end
    return 0
  end

  def crc16(data, poly)
    if !poly  poly = 0xA001 end
    # CRC-16 MODBUS HASHING ALGORITHM
    var crc = 0xFFFF
    for i:0..size(data)-1
      crc = crc ^ data[i]
      for j:0..7
        if crc & 1
          crc = (crc >> 1) ^ poly
        else
          crc = crc >> 1
        end
      end
    end
    return crc
  end

  # encode using NSPanel protocol
  # input: payload:json string
  def encode(payload)
    var b = bytes()
    var nsp_type = self.findtype(payload)
    b += self.header
    b.add(nsp_type)       # add a single byte
    b.add(size(payload), 2)   # add size as 2 bytes, little endian
    b += bytes().fromstring(payload)
    var msg_crc = self.crc16(b)
    b.add(msg_crc, 2)       # crc 2 bytes, little endian
    return b
  end

  def split_55(b)
    var ret = []
    var maxpos = size(b)-1
    var pos = 0

    while pos <= maxpos - 7 # minimum message size 7 bytes
      if b[pos] == 0x55 && b[pos+1] == 0xAA #if valid message header
        pos+=3 #go to payload length
        var plength=b.get(pos,1) #get payload length
        pos+=2 #go to payload begining
        var payload = b[(pos..pos+plength-1)] #copy payload content
        ret.push(payload) #add to result
        pos+=plength+3 #go to next message => plength + 2 for crc +1 for x00 messages separator 
      else 
        return ret #if no valid message return
      end
    end

    return ret
  end

  # send a string payload (needs to be a valid json string)
  def send(payload)
    print("NSP: Sent =", payload)
    var payload_bin = self.encode(payload)
    self.ser.write(payload_bin)
    # print("NSP: Sent =", payload)
    log("NSP: NSPanel payload sent = " + str(payload_bin), 3)
  end

  # sets time and date according to Tasmota local time
  def set_clock()
    var now = tasmota.rtc()
    var time_raw = now['local']
    var nsp_time = tasmota.time_dump(time_raw)
    var time_payload = '{"year":' + str(nsp_time['year']) + ',"mon":' + str(nsp_time['month']) + ',"day":' + str(nsp_time['day']) + ',"hour":' + str(nsp_time['hour']) + ',"min":' + str(nsp_time['min']) + ',"week":' + str(nsp_time['weekday']) + '}'
    log('NSP: Time and date synced with ' + time_payload, 3)
    self.send(time_payload)
  end

  # sync main screen power bars with tasmota POWER status
  def set_power()
    var ps = tasmota.get_power()
    for i:0..1
      if ps[i] == true
        ps[i] = "on"
      else 
        ps[i] = "off"
      end
    end
    var json_payload = '{\"switches\":[{\"outlet\":0,\"switch\":\"' + ps[0] + '\"},{\"outlet\":1,\"switch\":\"' + ps[1] +  '\"}]}'
    log('NSP: Switch state updated with ' + json_payload)
    self.send(json_payload)
  end  

  # read serial port and decode messages according to protocol used
  def every_100ms()
    if self.ser.available() > 0
      var msg = self.ser.read()   # read bytes from serial as bytes
      import string
      
      if size(msg) > 0
        print("NSP: Received Raw =", msg)
        var lst = self.split_55(msg)
        for i:0..size(lst)-1
          msg = lst[i]
          if msg != bytes('7B226572726F72223A307D') # don't publish {"error":0}
            var jm = string.format("{\"NSPanel\":%s}",msg.asstring())
            tasmota.publish_result(jm, "RESULT")
          end
        end
      end
    end       
  end
end #class    

nsp=NSPanel()

tasmota.add_rule("power1#state", /-> nsp.set_power())
tasmota.add_rule("power2#state", /-> nsp.set_power())

# add NSPSend command to Tasmota
def nspsend(cmd, idx, payload, payload_json)
  import json
  var command = nsp.send(json.dump(payload_json))
  tasmota.resp_cmnd_done()
end

tasmota.add_cmd('NSPSend', nspsend)

# set wifi icon status

def set_wifi(value)
  var rssi = (value-1)/20
  rssi = '{"wifiState":"connected","rssiLevel":' + str(rssi) + '}'
  log('NSP: Wi-Fi icon set with ' + rssi, 3)
  nsp.send(rssi)
end

def set_disconnect()
  nsp.send('{"wifiState":"nonetwork","rssiLevel":0}')
end

tasmota.cmd("Rule3 1") # needed until Berry bug fixed
tasmota.cmd("State")
tasmota.add_rule("Time#Minute", /-> nsp.set_clock()) # set rule to update clock every minute
tasmota.add_rule("Tele#Wifi#RSSI", set_wifi) # set rule to update wifi icon
tasmota.add_rule("wifi#disconnected", set_disconnect) # set rule to change wifi icon on disconnect
tasmota.add_rule("mqtt#disconnected", set_disconnect) # set rule to change wifi icon on disconnect
tasmota.cmd("TelePeriod")