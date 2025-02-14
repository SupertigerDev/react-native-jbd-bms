import React from 'react';
import {Text, TextProps} from 'react-native';

export const WhiteText = (props: TextProps) => {
  return (
    <Text {...props} style={{color: 'white', ...props.style}}>
      {props.children}
    </Text>
  );
};
