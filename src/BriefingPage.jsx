import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

const BriefingPage = () => {
    const logo = useSelector((state) => state.session.server?.attributes?.logo);
    const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };
    return (
        <div style={{ scrollBehavior: 'smooth' }}>
            {/* Fixed Top Bar with Glassmorphism */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.15)'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '1200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px'
                }}>
                {/* Left Section - Logo */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden'
                    }}>
                        {(() => {
                            const logoUrl = logo || logoInverted;
                            
                            return logoUrl ? (
                                <img 
                                    src={logoUrl} 
                                    alt="Server Logo" 
                                    style={{ 
                                        maxHeight: '50px',
                                        maxWidth: '200px',
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '40px',
                                    width: '40px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>T</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                    {/* Middle Section - Navigation Links */}
                    <div style={{ 
                        display: 'flex', 
                        gap: 'clamp(10px, 2vw, 30px)',
                        alignItems: 'center',
                        flexWrap: 'nowrap'
                    }}>
                        <motion.button
                            onClick={() => scrollToSection('section1')}
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{ 
                                color: 'grey', 
                                textDecoration: 'none', 
                                fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                                fontWeight: '500',
                                padding: '6px clamp(8px, 1.5vw, 12px)',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Section 1
                        </motion.button>
                        <motion.button
                            onClick={() => scrollToSection('section2')}
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{ 
                                color: 'grey', 
                                textDecoration: 'none', 
                                fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                                fontWeight: '500',
                                padding: '6px clamp(8px, 1.5vw, 12px)',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Section 2
                        </motion.button>
                        <motion.button
                            onClick={() => scrollToSection('section3')}
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{ 
                                color: 'grey', 
                                textDecoration: 'none', 
                                fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                                fontWeight: '500',
                                padding: '6px clamp(8px, 1.5vw, 12px)',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Section 3
                        </motion.button>
                        <motion.button
                            onClick={() => scrollToSection('section4')}
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{ 
                                color: 'gray', 
                                textDecoration: 'none', 
                                fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                                fontWeight: '500',
                                padding: '6px clamp(8px, 1.5vw, 12px)',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Section 4
                        </motion.button>
                    </div>

                    {/* Right Section - Login & Language */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'clamp(8px, 2vw, 15px)',
                        flexWrap: 'nowrap'
                    }}>
                        <select style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '6px',
                            color: 'gray',
                            padding: '6px clamp(8px, 1.5vw, 10px)',
                            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                            height: '36px',
                            minWidth: '50px'
                        }}>
                            <option value="en" style={{ background: '#333', color: 'white' }}>EN</option>
                            <option value="es" style={{ background: '#333', color: 'white' }}>ES</option>
                            <option value="fr" style={{ background: '#333', color: 'white' }}>FR</option>
                        </select>
                        <button style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '6px',
                            color: 'gray',
                            padding: '6px clamp(12px, 2vw, 16px)',
                            fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            height: '36px',
                            whiteSpace: 'nowrap'
                        }}>Login</button>
                    </div>
                </div>
            </div>
            
            <motion.div 
                id="section1" 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
                style={{ height: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <motion.h1
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    Section 1
                </motion.h1>
            </motion.div>
            
            <motion.div 
                id="section2" 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
                style={{ height: '100vh', backgroundColor: '#4ecdc4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <motion.h1
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    Section 2
                </motion.h1>
            </motion.div>
            
            <motion.div 
                id="section3" 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
                style={{ height: '100vh', backgroundColor: '#45b7d1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <motion.h1
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    Section 3
                </motion.h1>
            </motion.div>
            
            <motion.div 
                id="section4" 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
                style={{ height: '100vh', backgroundColor: '#96ceb4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <motion.h1
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    Section 4
                </motion.h1>
            </motion.div>
        </div>
    );
}

export default BriefingPage;