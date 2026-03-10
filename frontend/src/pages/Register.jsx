import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData.name, formData.email, formData.password, formData.phone);
            navigate('/');
        } catch (error) {
            console.error('Failed to register:', error);
            alert('Registration failed.');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 from-brand-50 to-brand-100 bg-gradient-to-br p-4">
            <div className="glass-panel w-full max-w-md p-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Create Account</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input name="name" type="text" required className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-brand-500 focus:ring-brand-500" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input name="email" type="email" required className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-brand-500 focus:ring-brand-500" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone for SMS (include + code)</label>
                        <input name="phone" type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-brand-500 focus:ring-brand-500" placeholder="+1234567890" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input name="password" type="password" required className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-brand-500 focus:ring-brand-500" onChange={handleChange} />
                    </div>
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors">
                        Register
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account? <span className="text-brand-600 cursor-pointer font-medium hover:underline" onClick={() => navigate('/login')}>Login</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
