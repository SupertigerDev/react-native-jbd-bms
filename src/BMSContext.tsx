import React from 'react';
import {Peripheral} from 'react-native-ble-manager';
import {BMS} from './BMS';

export const bms = new BMS();

const BMSContext = React.createContext({
  scan: null as unknown as () => Promise<void>,
  peripherals: [] as Peripheral[],
  selectedPeripheral: undefined as unknown as Peripheral | undefined,
  connect: (peripheral: Peripheral) => {
    peripheral;
  },
});

type Children = React.ReactElement | React.ReactElement[];

export const BMSProvider = (props: {children: Children}) => {
  const [peripherals, setPeripherals] = React.useState<Peripheral[]>([]);
  const [selectedPeripheral, setSelectedPeripheral] =
    React.useState<Peripheral>();

  const scan = async () => {
    const newPeripherals = await bms.scan();

    setPeripherals(newPeripherals);
  };

  const connect = async (peripheral: Peripheral) => {
    setSelectedPeripheral(peripheral);
    await bms.connect(peripheral);
  };

  return (
    <BMSContext.Provider
      value={{scan, peripherals, selectedPeripheral, connect}}>
      {props.children}
    </BMSContext.Provider>
  );
};

export const useBMS = () => {
  const context = React.useContext(BMSContext);
  if (context === undefined) {
    throw new Error('useBMS must be used within a BMSProvider');
  }
  return context;
};
