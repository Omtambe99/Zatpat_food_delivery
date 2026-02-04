import React from 'react'
import { Routes , Route} from 'react-router-dom';
import  SignIn from './Pages/SignIn.jsx'
import SignUp from './Pages/SignUp.jsx'
function App(){
  return (
    <div>
      <Routes>  
        <Route path='/signup' element={<SignUp />} />
        <Route path='/signin' element={<SignIn />} />

      </Routes>
    </div>
  )
}

export default App;