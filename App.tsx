/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {SafeAreaView, Text, View} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import Animated, {
  runOnUI,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

/////////////////////////////////////////////
/// Test hook to launch gc() every second ///
/////////////////////////////////////////////
const useGC = () => {
  const gcTimeout = useRef<ReturnType<typeof setTimeout>>();

  // This is a garbage collector workaround
  // we launch gc periodically to decrease memory footprint
  const callGC = useCallback(() => {
    // @ts-ignore
    global.gc();
    runOnUI(() => {
      // @ts-ignore
      global.gc();
    });
  }, []);

  useEffect(() => {
    gcTimeout.current = setTimeout(callGC, 1000);
    return () => {
      if (gcTimeout.current) clearTimeout(gcTimeout.current);
    };
  }, [callGC]);
};

/////////////////////////////////////////////
/// Sample animated component             ///
/////////////////////////////////////////////
type SectionProps = PropsWithChildren<{
  sharedVal: SharedValue<boolean>;
}>;

function Section({sharedVal}: SectionProps): JSX.Element {
  // Simple animated Style
  // This animatedStyle causes the leak !!!!
  const animatedWith = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: sharedVal?.value ? 1.095 : 1,
        },
      ],
    };
  });

  const _style = {
    backgroundColor: 'blue',
    left: 10,
    heigth: 10,
    width: 10,
  };

  // dummy animated View
  return (
    <Animated.View style={[_style, animatedWith]}>
      <Text>&</Text>
    </Animated.View>
  );
}

/////////////////////////////////////////////
/// Main component                        ///
/////////////////////////////////////////////

function App(): JSX.Element {
  // can play with this value for faster reproduction
  // or to ensure it reproduce with lower item count
  const numberOfSubview = 100;

  const lastRenderTime = useRef<Number | undefined>();

  // Just display time between each render
  if (lastRenderTime.current) {
    console.log('render duration:', Date.now() - lastRenderTime.current);
    lastRenderTime.current = Date.now();
  } else {
    lastRenderTime.current = Date.now();
  }

  // try gc() workaround
  useGC();

  // build array of integer
  const items = useMemo(() => {
    return [...Array(numberOfSubview).keys()];
  }, []);

  // loop to mount / unmount subViews
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setDisplay(display + 1);
    }, 10);
    // FIXME add timing here create strange UI :/
  }, [display]);

  // one unique shared value, shared between all object
  const sharedVal = useSharedValue(false);

  /*
  // To be enabled to test with a shutter wiew
  const shutterViewStyle: ViewProps = {
    height: '100%',
    width: '100%',
    position: 'absolute',
  };
  */

  return (
    <SafeAreaView
      style={{
        backgroundColor: Colors.darker,
      }}>
      {/** top here will move the animated views outside of viewPort */}
      <View style={{top: 10000}}>
        {display % 2 === 1
          ? items.map(it => {
              return <Section key={it} sharedVal={sharedVal} />;
            })
          : null}
        {/* Adding this view is another way to reproduce the issue
        <View style={shutterViewStyle} />
        */}
      </View>
    </SafeAreaView>
  );
}

export default App;
