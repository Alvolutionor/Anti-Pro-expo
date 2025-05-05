import { Alert, BackHandler, Text, View } from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, Link, useNavigation } from "expo-router";
import { Agenda } from "react-native-calendars";
import { useEffect } from "react";

export default function Activities() {
  //   const glob = useGlobalSearchParams();
  //     const local = useLocalSearchParams();
  // console.log("Local:", local, "Global:", glob);

  const { date } = useLocalSearchParams();
  // const navigation = useNavigation();
  // console.log(date);
  // useEffect(() => {
  //   const backAction = () => {
  //     navigation.push('(tabs)')
  //     return true;
  //   };
  //   const backHandler = BackHandler.addEventListener(
  //     'hardwareBackPress',
  //     backAction,
  //   );
  //   return () => backHandler.remove();
  // }, []);
  

    return (  
        <View>
            <Text>Todo list:</Text>
            <Text>Done list:</Text>
            <Text>Pending list:</Text>

      </View>
  );
}
