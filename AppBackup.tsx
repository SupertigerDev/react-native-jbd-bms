import React, {useEffect} from 'react';
import {PermissionsAndroid, Platform, StyleSheet, View} from 'react-native';
import BLEManager from 'react-native-ble-manager';

const bmsTx = '0000ff02-0000-1000-8000-00805f9b34fb';
const bmsRx = '0000ff01-0000-1000-8000-00805f9b34fb';

const handleAndroidPermissions = () => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]).then(result => {
      if (result) {
        console.debug(
          '[handleAndroidPermissions] User accepts runtime permissions android 12+',
        );
      } else {
        console.error(
          '[handleAndroidPermissions] User refuses runtime permissions android 12+',
        );
      }
    });
  } else if (Platform.OS === 'android' && Platform.Version >= 23) {
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).then(checkResult => {
      if (checkResult) {
        console.debug(
          '[handleAndroidPermissions] runtime permission Android <12 already OK',
        );
      } else {
        PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ).then(requestResult => {
          if (requestResult) {
            console.debug(
              '[handleAndroidPermissions] User accepts runtime permission android <12',
            );
          } else {
            console.error(
              '[handleAndroidPermissions] User refuses runtime permission android <12',
            );
          }
        });
      }
    });
  }
};

function App() {
  let found = false;
  useEffect(() => {
    handleAndroidPermissions();

    BLEManager.start({showAlert: false}).then(() => {
      console.log('BLE started');

      BLEManager.scan(['0000ff00-0000-1000-8000-00805f9b34fb'], 5, false).then(
        () => {
          // Success code
          console.log('Scan started');
        },
      );
    });

    const onStop = BLEManager.onDiscoverPeripheral(peripheral => {
      if (found) return;
      onStop.remove();
      BLEManager.stopScan();
      console.log(peripheral);

      BLEManager.connect(peripheral.id).then(async () => {
        // Success code
        console.log('Connected');

        await BLEManager.retrieveServices(peripheral.id).then(console.log);

        await BLEManager.startNotification(
          peripheral.id,
          '0000ff00-0000-1000-8000-00805f9b34fb',
          bmsRx,
        ).catch(error => {
          console.log(error);
        });

        const data = [0xdd, 0xa5, 0x3, 0x0, 0xff, 0xfd, 0x77];

        setTimeout(() => {
          BLEManager.write(
            peripheral.id,
            '0000ff00-0000-1000-8000-00805f9b34fb',
            bmsTx,
            data,
          );
        })
          .then(() => {
            console.log('written');
          })
          .catch(error => {
            // Failure code
            console.log(error);
          });
      }, 5000);
    });
    const onStop2 = BLEManager.onDidUpdateValueForCharacteristic(data => {
      console.log('Data received', data);
    });
    const onStop3 = BLEManager.onDidUpdateNotificationStateFor(data => {
      console.log('Data received', data);
    });

    return () => {
      onStop.remove();
      onStop2.remove();
      onStop3.remove();
      BLEManager.stopScan();
    };
  });

  return <View style={styles.sectionContainer}></View>;
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
