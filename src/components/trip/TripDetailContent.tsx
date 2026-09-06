import { createContext, Fragment, isValidElement, useContext, type ComponentType, type ReactElement } from "react";
import { FlatList, ScrollView, View, type FlatListProps, type ScrollViewProps } from "react-native";

// Detail owns scrolling and refresh; dialogs and standalone lists keep their own scroll.
export const TripDetailContentContext = createContext(false);

export function TripContentScrollView(props: ScrollViewProps) {
  const embedded = useContext(TripDetailContentContext);
  if (!embedded) return <ScrollView {...props} />;
  return <View style={[props.style, props.contentContainerStyle, { flex: 0, flexGrow: 0, paddingTop: 0, paddingBottom: 0 }]}>{props.children}</View>;
}

function accessory(value: ComponentType<any> | ReactElement | null | undefined) {
  if (!value || isValidElement(value)) return value;
  const Component = value as ComponentType;
  return <Component />;
}

export function TripContentFlatList<T>(props: FlatListProps<T>) {
  const embedded = useContext(TripDetailContentContext);
  if (!embedded) return <FlatList {...props} />;
  const data = Array.from(props.data || []);
  return <View style={[props.style, props.contentContainerStyle, { flex: 0, flexGrow: 0, paddingTop: 0, paddingBottom: 0 }]}>
    {accessory(props.ListHeaderComponent)}
    {data.length ? data.map((item, index) => <Fragment key={props.keyExtractor?.(item, index) ?? index}>
      {index > 0 && accessory(props.ItemSeparatorComponent)}
      {props.renderItem?.({ item, index, separators: { highlight() {}, unhighlight() {}, updateProps() {} } })}
    </Fragment>) : accessory(props.ListEmptyComponent)}
    {accessory(props.ListFooterComponent)}
  </View>;
}
