import React, { useEffect, useState } from 'react'
import {
View,
Text,
TextInput,
TouchableOpacity,
ScrollView,
Image,
Alert,
StyleSheet
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'

export default function AdminTopupCards(){

const [cards,setCards] = useState<any[]>([])
const [title,setTitle] = useState('')
const [provider,setProvider] = useState('')
const [amount,setAmount] = useState('')
const [price,setPrice] = useState('')
const [notes,setNotes] = useState('')
const [image,setImage] = useState('')

useEffect(()=>{
loadCards()
},[])

const loadCards = async ()=>{

const {data,error} = await supabase
.from('topup_cards')
.select('*')
.order('created_at',{ascending:false})

if(!error)setCards(data)

}

const uploadImage = async ()=>{

const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
quality:1
})

if(result.canceled) return

const uri = result.assets[0].uri

const file = await fetch(uri)
const blob = await file.blob()

const filename = Date.now()+'.jpg'

const {error} = await supabase.storage
.from('avatars')
.upload(filename,blob)

if(error){
Alert.alert(error.message)
return
}

const {data} = supabase.storage
.from('avatars')
.getPublicUrl(filename)

setImage(data.publicUrl)

}

const addCard = async ()=>{

if(!title || !provider){
Alert.alert('missing data')
return
}

const {error} = await supabase
.from('topup_cards')
.insert({
title,
provider,
amount_iqd:amount,
price_iqd:price,
image_url:image,
notes
})

if(error){
Alert.alert(error.message)
return
}

setTitle('')
setProvider('')
setAmount('')
setPrice('')
setNotes('')
setImage('')

loadCards()

}

const deleteCard = async(id:string)=>{

await supabase
.from('topup_cards')
.delete()
.eq('id',id)

loadCards()

}

return(

<ScrollView style={styles.container}>

<Text style={styles.title}>
Add New Card
</Text>

<TextInput
placeholder="Card name"
style={styles.input}
value={title}
onChangeText={setTitle}
/>

<TextInput
placeholder="Provider (Korek / Zain / Asia)"
style={styles.input}
value={provider}
onChangeText={setProvider}
/>

<TextInput
placeholder="Amount IQD"
style={styles.input}
value={amount}
onChangeText={setAmount}
/>

<TextInput
placeholder="Price IQD"
style={styles.input}
value={price}
onChangeText={setPrice}
/>

<TextInput
placeholder="Notes"
style={styles.input}
value={notes}
onChangeText={setNotes}
/>

<TouchableOpacity
style={styles.button}
onPress={uploadImage}
>
<Text style={styles.buttonText}>
Upload Image
</Text>
</TouchableOpacity>

{image &&
<Image
source={{uri:image}}
style={{height:100,marginVertical:10}}
/>
}

<TouchableOpacity
style={styles.button}
onPress={addCard}
>
<Text style={styles.buttonText}>
Add Card
</Text>
</TouchableOpacity>


<Text style={styles.title}>
All Cards
</Text>

{cards.map((card)=>(
<View key={card.id} style={styles.card}>

<Image
source={{uri:card.image_url}}
style={{height:70,width:70}}
/>

<View style={{flex:1}}>

<Text style={{fontWeight:'bold'}}>
{card.title}
</Text>

<Text>
{card.price_iqd} IQD
</Text>

</View>

<TouchableOpacity
onPress={()=>deleteCard(card.id)}
>
<Text style={{color:'red'}}>
Delete
</Text>
</TouchableOpacity>

</View>
))}

</ScrollView>

)

}

const styles = StyleSheet.create({

container:{
flex:1,
padding:20
},

title:{
fontSize:20,
fontWeight:'bold',
marginBottom:10
},

input:{
borderWidth:1,
padding:10,
marginBottom:10,
borderRadius:10
},

button:{
backgroundColor:'#FDE68A',
padding:15,
borderRadius:10,
alignItems:'center',
marginBottom:10
},

buttonText:{
fontWeight:'bold'
},

card:{
flexDirection:'row',
alignItems:'center',
gap:10,
marginVertical:10,
borderWidth:1,
padding:10,
borderRadius:10
}

})