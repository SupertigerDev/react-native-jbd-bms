import React, {useEffect} from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Header} from '../ui/Header';
import {WhiteText} from '../ui/WhiteText';
import {Colors} from '../Colors';
import {useBMS} from '../BMSContext';
import {Peripheral} from 'react-native-ble-manager';

export default function DeviceList() {
  return (
    <>
      <Header>Devices</Header>
      <List />
      <Text
        style={{
          textAlign: 'center',
          color: 'black',
          backgroundColor: 'white',
          fontSize: 18,
          padding: 10,
        }}
        onPress={() =>
          Linking.openURL(
            'https://github.com/SupertigerDev/react-native-jbd-bms',
          )
        }>
        GitHub
      </Text>
      <Text
        style={{
          textAlign: 'center',
          color: 'white',
          backgroundColor: '#FF6433',
          fontSize: 18,
          padding: 10,
        }}
        onPress={() => Linking.openURL('https://ko-fi.com/supertiger')}>
        Support Me On KoFi
      </Text>
    </>
  );
}

const List = () => {
  const {scan, peripherals} = useBMS();

  useEffect(() => {
    scan();
    const interval = setInterval(() => {
      scan();
    }, 8000);

    return () => clearInterval(interval);
  });
  return (
    <ScrollView>
      <View style={styles.listContainer}>
        {peripherals.length === 0 && (
          <WhiteText
            style={{
              textAlign: 'center',
              fontSize: 30,
              fontWeight: 'bold',
              opacity: 0.8,
            }}>
            Searching...
          </WhiteText>
        )}
        {peripherals.map((p, i) => (
          <DeviceItem key={i} item={p} />
        ))}
      </View>
    </ScrollView>
  );
};

const DeviceItem = (props: {item: Peripheral}) => {
  const {connect} = useBMS();
  return (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connect(props.item)}>
      <WhiteText style={{flex: 1}}>{props.item.name!}</WhiteText>
      <WhiteText>{props.item.rssi!}db</WhiteText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 6,
  },
  deviceItem: {
    flexDirection: 'row',
    backgroundColor: Colors.ItemBgColor,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
  },
});
