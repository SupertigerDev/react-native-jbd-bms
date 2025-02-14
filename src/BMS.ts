/* eslint-disable @typescript-eslint/no-shadow */
import {EventSubscription, PermissionsAndroid, Platform} from 'react-native';
import BLEManager, {
  BleManagerDidUpdateValueForCharacteristicEvent,
  Peripheral,
} from 'react-native-ble-manager';
import {Queue} from './Queue';
import {Buffer} from 'buffer';

const bmsService = '0000ff00-0000-1000-8000-00805f9b34fb';
const bmsTx = '0000ff02-0000-1000-8000-00805f9b34fb';
const bmsRx = '0000ff01-0000-1000-8000-00805f9b34fb';

const handleAndroidPermissions = () => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
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

interface BatteryInfo {
  name: string;
  totalVolts: number;
  current: number;
  remainingCapacityAh: number;
  nominalCapacityAh: number;
  totalCycles: number;
  remainingPercentSoc: number;
  bmsNumberOfCells: number;
  mosfetCharge: boolean;
  mosfetDischarge: boolean;
  balanceStatus: boolean[];
}
export class BMS {
  selectedPeripheral: Peripheral | undefined;

  constructor() {
    handleAndroidPermissions();
  }

  scanQueue = new Queue();

  scanCallback: EventSubscription | null = null;
  async scan() {
    return this.scanQueue.enqueue(async () => {
      console.log('scanning');

      await BLEManager.start({showAlert: false});
      await BLEManager.stopScan();

      this.scanCallback?.remove();
      const peripherals: Peripheral[] = [];

      this.scanCallback = BLEManager.onDiscoverPeripheral(
        (peripheral: Peripheral) => {
          const exists = peripherals.find(p => p.id === peripheral.id);
          if (!exists) {
            peripherals.push(peripheral);
          }
        },
      );
      await BLEManager.scan([bmsService], 3, false);

      return new Promise<Peripheral[]>(resolve => {
        setTimeout(() => {
          this.scanCallback?.remove();
          resolve(peripherals);
          console.log('scan completed');
        }, 3000);
      });
    });
  }

  async connect(peripheral: Peripheral) {
    console.log(`connecting to ${peripheral.name}`);
    this.selectedPeripheral = peripheral;

    await BLEManager.connect(peripheral.id, {autoconnect: true});
    await BLEManager.retrieveServices(peripheral.id);

    await BLEManager.startNotification(peripheral.id, bmsService, bmsRx);
    console.log('Connected!');

    // setInterval(async () => {
    //   await this.fetchBatteryInfo();
    // }, 1000);
  }

  fetchQueue = new Queue();
  // https://github.com/neilsheps/overkill-xiaoxiang-jbd-bms-ble-reader/blob/main/src/main.cpp
  // https://socket.dev/npm/package/jbd-overkill-bms-plugin/files/0.0.6/index.js
  async fetchBatteryInfo() {
    return this.fetchQueue.enqueue(async () => {
      if (!this.selectedPeripheral) {
        return null;
      }
      return await new Promise<BatteryInfo | null>(async resolve => {
        setTimeout(() => {
          resolve(null);
        }, 2000);
        const bmsDataReceived: number[] = [];
        let bmsDataLengthReceived = 0;

        const appendPacket = (data: number[], dataLength: number) => {
          // for (int i = 0; i < dataLen; i++) { bmsDataReceived[bmsDataLengthReceived++] = data[i]; }
          for (let i = 0; i < dataLength; i++) {
            bmsDataReceived[bmsDataLengthReceived++] = data[i];
          }

          if (bmsDataLengthReceived === bmsDataLengthExpected + 7) {
            const data = bmsDataReceived;
            if (data[1] === 0x03) {
              const totalVolts = (data[4] * 256 + data[5]) / 100;

              // const current = (data[6] * 256 + data[7]) / 100;
              const current = Number(
                bytesToFloat(data[6], data[7], 0.01, true),
              );

              const remainingCapacityAh = (data[8] * 256 + data[9]) / 100;

              const nominalCapacityAh = (data[10] * 256 + data[11]) / 100;

              const totalCycles = data[12] * 256 + data[13];

              const remainingPercentSoc = data[23];

              const bmsNumberOfCells = data[25];

              const mosfetCharge = (data[24] & 0x01) === 1 ? true : false;
              const mosfetDischarge = (data[24] & 0x02) === 2 ? true : false;

              const balanceStatus = getBalanceStatus(
                data[16],
                data[17],
                bmsNumberOfCells,
              );

              console.log(data);

              resolve({
                name: this.selectedPeripheral?.name!,
                totalVolts,
                remainingCapacityAh,
                current,
                remainingPercentSoc,
                nominalCapacityAh,
                totalCycles,
                bmsNumberOfCells,
                mosfetCharge,
                mosfetDischarge,
                balanceStatus,
              });
            }
          }
        };

        let bmsDataLengthExpected = 0;

        console.log('Fetching battery info');

        const listener = BLEManager.onDidUpdateValueForCharacteristic(
          (event: BleManagerDidUpdateValueForCharacteristicEvent) => {
            const data = event.value;
            if (bmsDataLengthReceived === 0) {
              bmsDataLengthExpected = data[3];
              if (data[0] !== 0xdd) {
                console.log('Invalid response');
                listener.remove();
                resolve(null);
                return;
              }
              appendPacket(data, data.length);
            } else {
              appendPacket(data, data.length);
            }
          },
        );
        const data = [0xdd, 0xa5, 0x3, 0x0, 0xff, 0xfd, 0x77];

        await BLEManager.write(
          this.selectedPeripheral!.id,
          '0000ff00-0000-1000-8000-00805f9b34fb',
          bmsTx,
          data,
        )
          .then(() => {
            console.log('written');
          })
          .catch(error => {
            // Failure code
            console.log(error);
          });
      });
    });
  }
  async fetchCellVoltages() {
    return this.fetchQueue.enqueue(async () => {
      if (!this.selectedPeripheral) {
        return null;
      }
      return await new Promise<number[] | null>(async resolve => {
        setTimeout(() => {
          resolve(null);
        }, 2000);
        const bmsDataReceived: number[] = [];
        let bmsDataLengthReceived = 0;

        const appendPacket = (data: number[], dataLength: number) => {
          // for (int i = 0; i < dataLen; i++) { bmsDataReceived[bmsDataLengthReceived++] = data[i]; }
          for (let i = 0; i < dataLength; i++) {
            bmsDataReceived[bmsDataLengthReceived++] = data[i];
          }

          if (bmsDataLengthReceived === bmsDataLengthExpected + 7) {
            const data = bmsDataReceived;
            if (data[1] === 0x04) {
              const cellVolts: number[] = [];
              const bmsNumberOfCells = data[3] / 2;
              for (let i = 0; i < bmsNumberOfCells; i++) {
                const millivolts = data[4 + 2 * i] * 256 + data[5 + 2 * i];
                const volts = millivolts / 1000;
                cellVolts.push(volts);
              }
              console.log(data);

              resolve(cellVolts);
            }
          }
        };

        let bmsDataLengthExpected = 0;

        console.log('Fetching battery info');

        const listener = BLEManager.onDidUpdateValueForCharacteristic(
          (event: BleManagerDidUpdateValueForCharacteristicEvent) => {
            const data = event.value;
            if (bmsDataLengthReceived === 0) {
              bmsDataLengthExpected = data[3];
              if (data[0] !== 0xdd) {
                console.log('Invalid response');
                listener.remove();
                resolve(null);
                return;
              }
              appendPacket(data, data.length);
            } else {
              appendPacket(data, data.length);
            }
          },
        );

        const data = [0xdd, 0xa5, 0x4, 0x0, 0xff, 0xfc, 0x77];

        await BLEManager.write(
          this.selectedPeripheral!.id,
          '0000ff00-0000-1000-8000-00805f9b34fb',
          bmsTx,
          data,
        )
          .then(() => {
            console.log('written');
          })
          .catch(error => {
            // Failure code
            console.log(error);
          });
      });
    });
  }
}
function toU16(byte1: number, byte2: number) {
  return Buffer.from([byte1, byte2]).readUInt16LE();
}
function process2BytesToBin(byte1: number, byte2: number) {
  const test = toU16(byte1, byte2).toString(2).padStart(16, '0');

  return test;
}
function getBalanceStatus(byte1: number, byte2: number, numCells: number) {
  const balanceBits = process2BytesToBin(byte1, byte2)
    .split('')
    .slice(0, numCells)
    .reverse();
  return balanceBits.map(bit => {
    return Boolean(parseInt(bit));
  });
}

//returns a float to two decimal points for a signed/unsigned int and a multiplier
function bytesToFloat(
  byte1: number,
  byte2: number,
  multiplier: number,
  signed: boolean,
) {
  multiplier = multiplier === undefined || multiplier === null ? 1 : multiplier;
  if (signed) {
    return parseFloat(toS16(byte1, byte2) * multiplier).toFixed(2);
  }
  return parseFloat(toU16(byte1, byte2) * multiplier).toFixed(2);
}
function toS16(byte1: number, byte2: number) {
  return Buffer.from([byte1, byte2]).readInt16BE();
}
