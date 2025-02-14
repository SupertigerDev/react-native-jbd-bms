import React, {useEffect} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import DeviceList from './src/pages/DeviceList';
import {bms, BMSProvider, useBMS} from './src/BMSContext';
import nodejs from 'nodejs-mobile-react-native';
import WebView from 'react-native-webview';
import {NetworkInfo} from 'react-native-network-info';

nodejs.start('main.js');

const sendResponse = (id: number, json: any, code = 200) => {
  nodejs.channel.send(
    JSON.stringify({
      id: id,
      status: code,
      json,
    }),
  );
};
nodejs.channel.addListener('message', async msg => {
  const json = JSON.parse(msg);

  if (json.path === '/info') {
    if (!bms.selectedPeripheral) {
      sendResponse(json.id, {code: 'DEVICE_NOT_SELECTED'}, 400);
      return;
    }
    const info = await bms.fetchBatteryInfo();
    const cellVolts = await bms.fetchCellVoltages();
    sendResponse(json.id, {...info, cellVolts});
  }
});

function App() {
  return (
    <BMSProvider>
      <View style={styles.container}>
        <PageHandler />
      </View>
    </BMSProvider>
  );
}

const PageHandler = () => {
  const {selectedPeripheral} = useBMS();
  const [localIp, setLocalIp] = React.useState('');

  useEffect(() => {
    NetworkInfo.getIPV4Address().then(ip => {
      setLocalIp(ip || '');
    });
  }, []);

  return (
    <>
      {!selectedPeripheral && <DeviceList />}
      {selectedPeripheral && (
        <View style={{flex: 1, backgroundColor: 'black'}}>
          <Text
            style={{textAlign: 'center', color: '#4c93ff'}}
            onPress={() => Linking.openURL(`http://${localIp}:12345`)}>
            Hosting on {localIp}:12345
          </Text>
          <WebView
            bounces={false}
            style={{backgroundColor: 'black', width: '100%', height: '100%'}}
            overScrollMode="never"
            setBuiltInZoomControls={false}
            textInteractionEnabled={false}
            textZoom={100}
            source={{uri: 'http://localhost:12345'}}
            webviewDebuggingEnabled
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
  },
});

export default App;
