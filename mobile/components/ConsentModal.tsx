import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

interface Props {
  visible: boolean
  onAccept: () => void
  onDecline: () => void
}

export default function ConsentModal({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Before We Continue</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>
              We turn your complaints into memes. To improve the service we anonymously store what
              kinds of problems people have — never your name or contact details.
            </Text>
            <Text style={styles.body}>
              Your complaint text is stripped of personal info before storage. You can decline and
              still use the app; we just won't keep anything.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.accept} onPress={onAccept}>
            <Text style={styles.acceptText}>I'm in — let's rant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.decline} onPress={onDecline}>
            <Text style={styles.declineText}>No thanks, just make memes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 160,
    marginBottom: 24,
  },
  body: {
    color: '#B0B0B0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  accept: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  decline: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  declineText: {
    color: '#B0B0B0',
    fontSize: 15,
  },
})
