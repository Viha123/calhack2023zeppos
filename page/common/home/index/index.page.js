import { BasePage } from "@zeppos/zml/base-page";
import { url } from "../const";
// import { layout } from 'zosLoader:./index.[pf].layout.js'
import { Geolocation } from "@zos/sensor";

import AutoGUI from "@silver-zepp/autogui";
const gui = new AutoGUI();

import VisLog from "@silver-zepp/vis-log";
const vis = new VisLog("index");

import { Vibrator, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
const vibrator = new Vibrator()

const geolocation = new Geolocation();

const COLOR_GREEN = 0x00ff00;
const COLOR_RED = 0xff0000;

// get meters from two GPS coords
function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6373.0;
  var lat_1 = lat1 * Math.PI / 180;
  var lon_1 = lat2 * Math.PI / 180;
  var lat_2 = ( lat2 - lat1 ) * Math.PI / 180;
  var lon_2 = ( lon2 - lon1 ) * Math.PI / 180;

  var a = Math.sin( lat_2 / 2 ) * Math.sin( lat_2 / 2 ) +
          Math.cos( lat_1 ) * Math.cos( lon_1 ) *
          Math.sin( lon_2 / 2 ) * Math.sin( lon_2 / 2 );
  var c = 2 * Math.atan2( Math.sqrt(a), Math.sqrt( 1 - a ));

  return R * c; 
}

Page(
  BasePage({
    state: {
      lat_gunman: 1.0,
      long_gunman: 1.0,
    },
    onInit() {
      const callback = () => {
        vis.log('pos_status', geolocation.getStatus())
        const lat = geolocation.getLatitude();
        const long = geolocation.getLongitude();
        
        this.txt_lat.update({ text: "LAT:\n" + lat });
        this.txt_lon.update({ text: "LON:\n" + long });

        this.fetchGunmanData();

        this.txt_enemy_lat.update({ text: "ENEMY_LAT:\n" + this.state.lat_gunman });
        this.txt_enemy_lon.update({ text:" ENEMY_LONG:\n" + this.state.long_gunman });

        // vis.log('lat_gunman', this.state.lat_gunman);
        // vis.log('long_gunman', this.state.long_gunman);
        //Math.abs(lat - this.state.lat_gunman) < 0.000001 && Math.abs(long - this.state.long_gunman) < 0.000001 ? vis.log("You are safe") : vibrator.start();
        
        var distance = getDistance(lat, long, this.state.lat_gunman, this.state.long_gunman);

        // if (distance < 2) {
        //   this.txt_safety.update({ text: "You are safe", color: COLOR_GREEN });
        // } else {
        //   this.txt_safety.update({ text: "You are in danger!", color: COLOR_RED });
        //   vibrator.start();
        // }
        
        if (Math.abs(lat - this.state.lat_gunman) > 0.0001 && Math.abs(long - this.state.long_gunman) > 0.0001) {
            this.txt_safety.update({  text: "You are safe",  color: COLOR_GREEN  });
        } else {
            this.txt_safety.update({  text: "You are in danger!",  color: COLOR_RED  });
            vibrator.start();
        }
      }
      geolocation.start();
      geolocation.onChange(callback);
    },
		drawGUI(){
			this.txt_safety = gui.text("You are safe?", { color: COLOR_GREEN });
      gui.newRow();
      
      gui.startGroup()
        gui.strokeRect()
        this.txt_lat = gui.text("LAT: 0", { text_size: 16 });
      gui.endGroup()
      gui.startGroup()
        gui.strokeRect()
        this.txt_lon = gui.text("LON: 0", { text_size: 16 });
      gui.endGroup()
      
      gui.newRow();

      gui.startGroup()
        gui.strokeRect()
        this.txt_enemy_lat = gui.text("ENEMY_LAT: 0", { text_size: 16 }); // this.state.lat_gunman
      gui.endGroup()
      gui.startGroup()
        gui.strokeRect()
        this.txt_enemy_lon = gui.text("ENEMY_LONG: 0", { text_size: 16 }); // this.state.long_gunman
      gui.endGroup()
      
			gui.newRow();

			gui.button("POST", ()=> {
				const lat = geolocation.getLatitude();
        const long = geolocation.getLongitude();
        this.syncData({ lat, long });
			});
			gui.render();

		},
    build() {
			this.drawGUI();
      //vis.updateSettings({ line_count: 10 })
      vis.updateSettings({ visual_log_enabled: false });
    },
    fetchData() {
      this.request({
        method: "GET_DATA",
      })
        .then((data) => {
          vis.log("fetch: receive data");
          const { result = {} } = data;
          const { text } = result;
          vis.log(text)
        })
        .catch((res) => {});
    },
    fetchGunmanData() {
      return this.httpRequest({
        method: 'get',
        url: `${url}/data`,
      })
      .then((result) => {
        this.state.lat_gunman = result.body[0].lat;
        this.state.long_gunman = result.body[0].long;
        // console.log("lat_gunman", this.state.lat_gunman);
        // console.log("long_gunman", this.state.long_gunman);
      })
      .catch((error) => {
        // layout.updateTxtError()
        vis.error('error=>%j', error)
      })
    },
    syncData(data) {
      // layout.updateTxtUploading()
      vis.log("changing data");
      return this.httpRequest({
        method: 'delete',
        url: `${url}/locationData`,
      })
      .then(() => {
        // Then, insert the new document
        return this.httpRequest({
          method: 'post',
          url: `${url}/locationData`,
          body: data,
        });
      })
      .then((result) => {
        // layout.updateTxtSuccess()
        vis.log('result => %j', result)
      })
      .catch((error) => {
        // layout.updateTxtError()
        vis.error('error => %j', error);
      })
    },
    onDestroy() {
			
    }
  })
);