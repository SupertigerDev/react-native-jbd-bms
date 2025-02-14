import React from 'react';
import {StyleSheet, Text} from 'react-native';

export function Header(props: {children: string}) {
  return <Text style={styles.header}>{props.children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 10,
  },
});
